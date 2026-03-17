import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private readonly eskiz_provider_name = '4546';
  private readonly eskiz_email: string;
  private readonly eskiz_password: string;
  private readonly eskiz_url: string;
  private readonly eskiz_sms_message: string;

  private bearer_token: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.eskiz_email = configService.getOrThrow('ESKIZ_EMAIL');
    this.eskiz_password = configService.getOrThrow('ESKIZ_PASSWORD');
    this.eskiz_url = configService.getOrThrow('ESKIZ_URL');
    this.eskiz_sms_message = configService.getOrThrow('ESKIZ_SMS_MESSAGE');
  }

  async onModuleInit() {
    await this.loginToEskiz();
  }

  private async loginToEskiz(): Promise<void> {
    // Race condition oldini olish: agar allaqachon refresh bo'layotgan bo'lsa, kutib turadi
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doLogin().finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async _doLogin(): Promise<void> {
    const res = await firstValueFrom(
      this.httpService.post<{ data: { token: string } }>(
        `${this.eskiz_url}/auth/login`,
        {
          email: this.eskiz_email,
          password: this.eskiz_password,
        },
      ),
    );
    // Eskiz: response.data.data.token
    this.bearer_token = res.data.data.token;
    this.logger.log('Eskiz login successful');
  }

  async sendSms({
    phone,
    code,
  }: {
    phone: string;
    code: number;
  }): Promise<void> {
    await this.sendWithRetry(phone, code, false);
  }

  private async sendWithRetry(
    phone: string,
    code: number,
    isRetry: boolean,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.eskiz_url}/message/sms/send`,
          {
            mobile_phone: phone,
            message: `${this.eskiz_sms_message} ${code}`,
            from: this.eskiz_provider_name,
          },
          {
            headers: {
              Authorization: `Bearer ${this.bearer_token}`,
            },
          },
        ),
      );
    } catch (error: any) {
      const status = error?.response?.status;

      // 401 kelsa va bu birinchi urinish bo'lsa — qayta login qilib yuboramiz
      if (status === 401 && !isRetry) {
        this.logger.warn('Token expired, re-logging in...');
        await this.loginToEskiz();
        return this.sendWithRetry(phone, code, true); // isRetry = true, infinite loop yo'q
      }

      this.logger.error(`SMS send failed: ${error?.message}`, error?.stack);
      throw error;
    }
  }
}
