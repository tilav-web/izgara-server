export const regexPhone = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');

  const uzPhoneRegex =
    /^998(33|50|70|75|77|78|88|90|91|93|94|95|97|98|99|20)\d{7}$/;

  const test = uzPhoneRegex.test(cleanPhone);

  return { test, cleanPhone };
};
