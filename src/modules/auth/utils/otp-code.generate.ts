export const otpCodeGenerate = (): number => {
    return Math.floor(1000 + Math.random() * 9000);
}
