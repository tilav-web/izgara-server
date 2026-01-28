import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Repository } from "typeorm";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly repository: Repository<User>
    ) { }

    async findById(id: number) {
        return this.repository.findOne({ where: { id } })
    }

    async findByAuthId(id: number) {
        return this.repository.findOne({ where: { auth: { id } } })
    }

    async create({ phone, first_name, last_name }: { phone: string; first_name?: string; last_name?: string; }) {
        const user = this.repository.create({ phone, first_name, last_name })
        const result = await this.repository.save(user)
        return result
    }
}