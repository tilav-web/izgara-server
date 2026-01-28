import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import { UserRedisService } from "../redis/user-redis.service";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly repository: Repository<User>,
        private readonly userRedisService: UserRedisService
    ) { }

    async findById(id: number) {
        return this.repository.findOne({ where: { id } })
    }

    async findByAuthId(id: number) {
        const cacheUser = await this.userRedisService.getUserDetails(id)
        if (cacheUser) return cacheUser
        const user = await this.repository.findOne({ where: { auth: { id } } })
        if (user) {
            await this.userRedisService.setUserDetails({ user, auth_id: id })
        }
        return user
    }

    async create({ phone, first_name, last_name }: { phone: string; first_name?: string; last_name?: string; }) {
        const user = this.repository.create({ phone, first_name, last_name })
        const result = await this.repository.save(user)
        return result
    }
}