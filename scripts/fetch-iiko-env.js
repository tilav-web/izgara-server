"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = 'https://api-ru.iiko.services';
async function main() {
    const apiLogin = process.env.IIKO_API_LOGIN || '28df0ea79a334ae3915b1d728891b3e9';
    console.log('=== IIKO ENV qiymatlarini olish ===\n');
    console.log('1. Token olinmoqda...');
    const tokenRes = await fetch(`${BASE_URL}/api/1/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiLogin }),
    });
    if (!tokenRes.ok) {
        console.error('Token olishda xatolik:', await tokenRes.text());
        process.exit(1);
    }
    const { token } = (await tokenRes.json());
    console.log('   Token olindi.\n');
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    console.log('2. Organization ID olinmoqda...');
    const orgRes = await fetch(`${BASE_URL}/api/1/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            returnAdditionalInfo: false,
            includeDisabled: false,
        }),
    });
    const orgData = (await orgRes.json());
    if (!orgData.organizations?.length) {
        console.error('Organization topilmadi!');
        process.exit(1);
    }
    const org = orgData.organizations[0];
    console.log(`   Topildi: "${org.name}" -> ${org.id}\n`);
    console.log('3. Terminal Group ID olinmoqda...');
    const tgRes = await fetch(`${BASE_URL}/api/1/terminal_groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            organizationIds: [org.id],
            includeDisabled: false,
        }),
    });
    const tgData = (await tgRes.json());
    const terminalGroups = tgData.terminalGroups?.flatMap((g) => g.items) || [];
    if (!terminalGroups.length) {
        console.error('Terminal group topilmadi!');
        process.exit(1);
    }
    const tg = terminalGroups[0];
    console.log(`   Topildi: "${tg.name}" -> ${tg.id}\n`);
    console.log('4. Payment Types olinmoqda...');
    const ptRes = await fetch(`${BASE_URL}/api/1/payment_types`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ organizationIds: [org.id] }),
    });
    const ptData = (await ptRes.json());
    const paymentTypes = (ptData.paymentTypes || []).filter((p) => !p.isDeleted);
    console.log('   Topilgan to\'lov turlari:');
    console.log('   ─────────────────────────────────────────────────────');
    for (const pt of paymentTypes) {
        console.log(`   [${pt.paymentTypeKind}] "${pt.name}" (code: ${pt.code || '-'}) -> ${pt.id}`);
    }
    const cashPayment = paymentTypes.find((p) => p.paymentTypeKind === 'Cash');
    const cardPayment = paymentTypes.find((p) => p.paymentTypeKind === 'Card');
    const externalPayment = paymentTypes.find((p) => p.paymentTypeKind === 'External');
    console.log('\n\n========================================');
    console.log('  .env ga qo\'shing:');
    console.log('========================================\n');
    console.log(`IIKO_BASE_URL=${BASE_URL}`);
    console.log(`IIKO_API_LOGIN=${apiLogin}`);
    console.log(`IIKO_ORGANIZATION_ID=${org.id}`);
    console.log(`IIKO_TERMINAL_GROUP_ID=${tg.id}`);
    console.log(`IIKO_PAYMENT_CASH=${cashPayment?.id || '# TOPILMADI - qo\'lda tanlang'}`);
    console.log(`IIKO_PAYMENT_CARD=${cardPayment?.id || '# TOPILMADI - qo\'lda tanlang'}`);
    console.log(`IIKO_PAYMENT_ONLINE=${externalPayment?.id || '# TOPILMADI - qo\'lda tanlang'}`);
    console.log(`IIKO_WEBHOOK_TOKEN=# O'zingiz generatsiya qiling: openssl rand -hex 32`);
    if (!cashPayment || !cardPayment || !externalPayment) {
        console.log('\n⚠️  Ba\'zi to\'lov turlari avtomatik topilmadi.');
        console.log('   Yuqoridagi ro\'yxatdan to\'g\'ri ID larni tanlang.');
    }
}
main().catch((err) => {
    console.error('Xatolik:', err);
    process.exit(1);
});
//# sourceMappingURL=fetch-iiko-env.js.map