import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  type AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

@Injectable()
export class AliPosBaseService implements OnModuleInit {
  private readonly logger = new Logger(AliPosBaseService.name);
  private accessToken: string | null = null;
  protected restaurantId: string | null = null;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Server yoqilganda ulanishni boshlaymiz
    // 10 marta urinish, har safar oraliq vaqt ortib boradi
    await this.initConnectionWithRetry(10);
  }

  /**
   * AliPos ga ulanish va sozlamalarni yuklash (Retry mexanizmi bilan)
   */
  private async initConnectionWithRetry(maxRetries: number) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.logger.log(
          `AliPos-ga ulanishga urinish (${i + 1}/${maxRetries})...`,
        );

        await this.refreshAccessToken();
        await this.loadRestaurantId();
        this.setupInterceptors();

        this.logger.log('✅ AliPos-ga ulanish muvaffaqiyatli yakunlandi.');
        return; // Muvaffaqiyatli bo'lsa tsikldan chiqish
      } catch (error) {
        const err = error as AxiosError;
        // Har bir urinish orasidagi vaqt: 2s, 4s, 8s, 16s... (Exponential backoff)
        const delay = Math.pow(2, i) * 1000;
        this.logger.error(
          `❌ AliPos init xatosi: ${err.message}. ${delay / 1000} soniyadan keyin qayta urinadi...`,
        );

        if (i === maxRetries - 1) {
          this.logger.fatal(
            '‼️ AliPos-ga ulanishning barcha urinishlari xato bilan tugadi.',
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * OAuth2 Token olish/yangilash
   */
  private async refreshAccessToken() {
    const url = '/security/oauth/token';
    const client_id = this.configService.get<string>('ALIPOS_CLIENT_ID');
    const client_secret = this.configService.get<string>(
      'ALIPOS_CLIENT_SECRET',
    );
    const grant_type =
      this.configService.get<string>('ALIPOS_GRANT_TYPE') ||
      'client_credentials';

    if (!client_id || !client_secret) {
      throw new Error('ALIPOS_CLIENT_ID yoki ALIPOS_CLIENT_SECRET topilmadi!');
    }

    const urls = new URLSearchParams({
      client_id,
      client_secret,
      grant_type,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, urls.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const data = response.data as { access_token: string };

      this.accessToken = data.access_token;
      // Default header-ga o'rnatamiz
      this.httpService.axiosRef.defaults.headers.common['Authorization'] =
        `Bearer ${this.accessToken}`;
    } catch (error) {
      const err = error as AxiosError;
      const status = err.response?.status;
      const data = err.response?.data;
      throw new Error(
        `Auth xatosi [${status}]: ${JSON.stringify(data || err.message)}`,
      );
    }
  }

  /**
   * Restoran ID sini yuklash
   */
  private async loadRestaurantId() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/restaurants'),
      );
      const data = response.data as {
        places: {
          id: string;

          title: string;

          address: string | null;
        }[];
      };

      const places = data.places;

      if (places && places.length > 0) {
        this.restaurantId = places[places.length - 1].id;
      }
    } catch (error) {
      const err = error as AxiosError;
      throw new Error(`RestaurantId yuklashda xato: ${err.message}`);
    }
  }

  /**
   * Axios Interceptor-lar: 401 (token) va 5xx (server) xatolarini ushlash uchun
   */
  private setupInterceptors() {
    // Avvalgi interceptorlarni tozalash (duplicate bo'lmasligi uchun)
    this.httpService.axiosRef.interceptors.response.handlers = [];

    this.httpService.axiosRef.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retryCount?: number;
        };
        const status = error.response?.status;

        // 1. Agar token eskirgan bo'lsa (401)
        if (
          status === 401 &&
          !(
            originalRequest as InternalAxiosRequestConfig & {
              _isRetry?: boolean;
            }
          )._isRetry
        ) {
          (
            originalRequest as InternalAxiosRequestConfig & {
              _isRetry?: boolean;
            }
          )._isRetry = true;
          this.logger.warn('Token eskirgan, yangilanmoqda...');

          await this.refreshAccessToken();

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] =
              `Bearer ${this.accessToken}`;
          }
          return this.httpService.axiosRef(originalRequest);
        }

        // 2. Agar AliPos serverida muammo bo'lsa (500, 502, 503, 504)
        const retryLimit = 3;
        originalRequest._retryCount = originalRequest._retryCount || 0;

        if (
          status &&
          status >= 500 &&
          originalRequest._retryCount < retryLimit
        ) {
          originalRequest._retryCount++;
          const waitTime = originalRequest._retryCount * 2000;

          this.logger.warn(
            `AliPos serverida xato (${status}). Qayta urinish: ${originalRequest._retryCount}/${retryLimit}`,
          );

          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.httpService.axiosRef(originalRequest);
        }

        return Promise.reject(error);
      },
    );
  }
}
