import { BadGatewayException, Injectable, OnModuleInit } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AliPosBaseService implements OnModuleInit {
    private accessToken: string | null = null;
    protected restaurantId: string | null = null;

    constructor(protected readonly httpService: HttpService, protected readonly configService: ConfigService) { }

    async onModuleInit() {
        try {
            await this.refreshAccessToken();
            await this.loadRestaurantId();
            this.setupInterceptors();
        } catch (error) {
            console.warn(
                '[AliPos] Init skip qilindi:',
                error?.message || error
            );
        }
    }


    private async refreshAccessToken() {
        const url = '/security/oauth/token';

        const client_id = this.configService.get<string>('ALIPOS_CLIENT_ID')
        const client_secret = this.configService.get<string>('ALIPOS_CLIENT_SECRET')
        const grant_type = this.configService.get<string>('ALIPOS_GRANT_TYPE') || 'client_credentials'
        if (!client_id || !client_secret || !grant_type) {

            throw new BadGatewayException('alipos sozlamalari topilmadi!')
        }

        const data = new URLSearchParams({
            client_id,
            client_secret,
            grant_type,
        });

        const response = await firstValueFrom(
            this.httpService.post(url, data.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            })
        );

        this.accessToken = response.data.access_token;
        this.httpService.axiosRef.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    }

    private async loadRestaurantId() {
        try {
            const response = await firstValueFrom(
                this.httpService.get('/restaurants')
            );

            const places = response.data.places;

            if (places && places.length > 0) {
                this.restaurantId = places[places.length - 1].id;
            }
        } catch (error) {
            console.error('Restoran ID sini yuklashda xato yuz berdi:', error);
        }
    }

    private setupInterceptors() {
        this.httpService.axiosRef.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    await this.refreshAccessToken();
                    originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    return this.httpService.axiosRef(originalRequest);
                }
                return Promise.reject(error);
            }
        );
    }
}
