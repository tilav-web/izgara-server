export const regexPhone = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, "");

  const uzPhoneRegex =
    /^998(90|91|93|94|95|97|98|99|33|88)\d{7}$/;

  const test = uzPhoneRegex.test(cleanPhone);

  return { test, cleanPhone };
};
