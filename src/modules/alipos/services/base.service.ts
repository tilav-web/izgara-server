import { Injectable, OnModuleInit } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class AliPosBaseService implements OnModuleInit {
    private accessToken: string | null = null;
    protected restaurantId: string | null = null;

    constructor(protected readonly httpService: HttpService) { }

    async onModuleInit() {
        await this.refreshAccessToken();
        await this.loadRestaurantId();
        this.setupInterceptors();
    }

    private async refreshAccessToken() {
        const url = '/security/oauth/token';

        const data = new URLSearchParams({
            client_id: '7c37e258-7d4e-4f31-8d61-586e22ddbbb6',
            client_secret: '709c6a50-6a5f-4862-869d-671f5471b6f3',
            grant_type: 'client_credentials',
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
                // Massivning eng oxirgi elementining ID sini olamiz
                this.restaurantId = places[places.length - 1].id;
                console.log('Tanlangan Restaurant ID:', this.restaurantId);
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
