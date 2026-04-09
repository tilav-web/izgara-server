import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  IikoAccessTokenResponse,
  IikoAuthState,
  IikoHttpMethod,
  IikoOrganizationsResponse,
  IikoTerminalGroupsResponse,
} from '../types/iiko.types';
import { IIKO_API_ENDPOINTS, IIKO_AUTH_TOKEN_TTL_MS } from '../utils/constants';

@Injectable()
export class IikoBaseService {
  private readonly logger = new Logger(IikoBaseService.name);
  private authState: IikoAuthState | null = null;
  protected organizationId: string | null = null;
  protected terminalGroupId: string | null = null;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  public async login(force = false): Promise<IikoAuthState> {
    if (!force && this.hasValidAuthState()) {
      return this.authState as IikoAuthState;
    }

    const apiLogin = this.configService.get<string>('IIKO_API_LOGIN');
    if (!apiLogin) {
      throw new BadGatewayException('IIKO_API_LOGIN env topilmadi');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<IikoAccessTokenResponse>(
          IIKO_API_ENDPOINTS.AUTH.token,
          { apiLogin },
        ),
      );

      this.authState = {
        correlationId: response.data.correlationId,
        token: response.data.token,
        expiresAt: Date.now() + IIKO_AUTH_TOKEN_TTL_MS,
      };

      return this.authState;
    } catch (error) {
      const err = error as AxiosError;
      this.logger.error(
        'IIKO login failed',
        err.response?.data || err.message || err,
      );
      throw new BadGatewayException('IIKO login qilishda xatolik yuz berdi');
    }
  }

  protected async getOrganizationId(): Promise<string> {
    if (this.organizationId) return this.organizationId;

    const envOrganizationId = this.configService.get<string>(
      'IIKO_ORGANIZATION_ID',
    );
    if (envOrganizationId) {
      this.organizationId = envOrganizationId;
      return envOrganizationId;
    }

    const data = await this.request<
      { returnAdditionalInfo: boolean; includeDisabled: boolean },
      IikoOrganizationsResponse
    >(IIKO_API_ENDPOINTS.ORGANIZATIONS.findAll, {
      returnAdditionalInfo: true,
      includeDisabled: false,
    });

    const organization = data.organizations.find(
      (item) => !item.isDeleted && !item.isDisabled,
    );

    if (!organization) {
      throw new BadGatewayException('IIKO organization topilmadi');
    }

    this.organizationId = organization.id;
    return organization.id;
  }

  protected async getTerminalGroupId(): Promise<string> {
    if (this.terminalGroupId) return this.terminalGroupId;

    const envTerminalGroupId = this.configService.get<string>(
      'IIKO_TERMINAL_GROUP_ID',
    );
    if (envTerminalGroupId) {
      this.terminalGroupId = envTerminalGroupId;
      return envTerminalGroupId;
    }

    const organizationId = await this.getOrganizationId();
    const data = await this.request<
      { organizationIds: string[]; includeDisabled: boolean },
      IikoTerminalGroupsResponse
    >(IIKO_API_ENDPOINTS.TERMINAL_GROUPS.findAll, {
      organizationIds: [organizationId],
      includeDisabled: false,
    });

    const terminalGroup = data.terminalGroups
      .flatMap((wrapper) => wrapper.items)
      .find((item) => !item.isDeleted && !item.isDisabled);

    if (!terminalGroup) {
      throw new BadGatewayException('IIKO terminal group topilmadi');
    }

    this.terminalGroupId = terminalGroup.id;
    return terminalGroup.id;
  }

  protected async request<TRequest, TResponse>(
    url: string,
    data: TRequest,
    method: IikoHttpMethod = 'POST',
  ): Promise<TResponse> {
    const authState = await this.login();

    try {
      const response = await firstValueFrom(
        this.httpService.request<TResponse>({
          method,
          url,
          data,
          headers: {
            Authorization: `Bearer ${authState.token}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      if (err.response?.status === 401) {
        const refreshedAuthState = await this.login(true);
        const response = await firstValueFrom(
          this.httpService.request<TResponse>({
            method,
            url,
            data,
            headers: {
              Authorization: `Bearer ${refreshedAuthState.token}`,
            },
          }),
        );

        return response.data;
      }

      this.logger.error('IIKO API request failed', err.response?.data || err);
      throw new BadGatewayException('IIKO API sorovida xatolik yuz berdi');
    }
  }

  protected getAuthState() {
    return this.authState;
  }

  private hasValidAuthState() {
    return Boolean(
      this.authState?.token &&
      this.authState.expiresAt &&
      Date.now() < this.authState.expiresAt,
    );
  }
}
