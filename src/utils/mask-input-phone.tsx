export const insertMaskInPhone = (value: string): string => {
    const onlyNumbers = value.replace(/\D/g, '');
    const { length } = onlyNumbers;
    if (length <= 11) {
        return onlyNumbers
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(length === 11 ? /(\d{5})(\d)/ : /(\d{4})(\d)/, '$1-$2');
    }
    return onlyNumbers;
}