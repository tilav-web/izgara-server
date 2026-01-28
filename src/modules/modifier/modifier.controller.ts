import { Controller } from "@nestjs/common";
import { ModifierService } from "./modifier.service";

@Controller('modifiers')
export class ModifierController {
    constructor(
        private readonly modifierService: ModifierService
    ) { }
}