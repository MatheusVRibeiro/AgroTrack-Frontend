/**
 * Converte string ou número para número, retorna 0 se inválido
 */
export const toNumber = (valor: any): number => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const num = Number(valor.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};
// --- FORMATAÇÕES ---

export const formatarCPF = (valor: string): string => {
  if (!valor) return '';
  const limpo = valor.replace(/\D/g, '');
  return limpo
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14);
};

export const formatarCNPJ = (valor: string): string => {
  if (!valor) return '';
  const limpo = valor.replace(/\D/g, '');
  return limpo
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .substring(0, 18);
};

/**
 * Formata documento (CPF ou CNPJ) dependendo do tamanho dos dígitos.
 * Se tiver até 11 dígitos -> CPF, senão CNPJ.
 */
export const formatarDocumento = (valor: string | undefined | null): string => {
  if (!valor) return '';
  const limpo = String(valor).replace(/\D/g, '');
  if (limpo.length <= 11) return formatarCPF(limpo);
  return formatarCNPJ(limpo);
};

export const formatarTelefone = (valor: string): string => {
  const limpo = valor.replace(/\D/g, '');
  if (limpo.length <= 10) {
    // Formato: (00) 0000-0000
    return limpo
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 14);
  } else {
    // Formato: (00) 00000-0000
    return limpo
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  }
};

export const formatarCEP = (valor: string): string => {
  const limpo = valor.replace(/\D/g, '');
  return limpo
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);
};

export const apenasNumeros = (valor: string): string => {
  return valor.replace(/\D/g, '');
};

export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

/**
 * Formata input de moeda em tempo real (enquanto digita)
 * @param valor String digitada pelo usuário
 * @returns String formatada como moeda brasileira
 */
export const formatarInputMoeda = (valor: string): string => {
  // Remove tudo que não é número
  const apenasNumeros = valor.replace(/\D/g, '');
  
  if (!apenasNumeros) return '';
  
  // Converte para número considerando centavos
  const valorNumerico = Number(apenasNumeros) / 100;
  
  // Formata como moeda brasileira
  return valorNumerico.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Converte string formatada como moeda para número
 * @param valorFormatado String formatada (ex: "1.234,56")
 * @returns Número (ex: 1234.56)
 */
export const desformatarMoeda = (valorFormatado: string): number => {
  if (!valorFormatado) return 0;
  
  // Remove pontos de milhar e substitui vírgula por ponto
  const valorLimpo = valorFormatado
    .replace(/\./g, '')
    .replace(',', '.');
  
  return Number(valorLimpo) || 0;
};

export const formatarData = (data: string): string => {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

// --- VALIDAÇÕES ---

export const validarEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validarCPF = (cpf: string): boolean => {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11 || /^(\d)\1+$/.test(limpo)) return false;
  
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(10, 11))) return false;
  
  return true;
};

export const validarCNH = (cnh: string): boolean => {
  const limpo = cnh.replace(/\D/g, '');
  return limpo.length === 11; // Validação básica de comprimento
};

export const validarTelefone = (telefone: string): boolean => {
  const limpo = telefone.replace(/\D/g, '');
  return limpo.length === 10 || limpo.length === 11;
};

export const validarCEP = (cep: string): boolean => {
  const limpo = cep.replace(/\D/g, '');
  return limpo.length === 8;
};

/**
 * Converte data de formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss) 
 * para formato brasileiro (DD/MM/YYYY)
 * @param dataISO Data em formato ISO
 * @returns Data em formato DD/MM/YYYY
 */
export const formatarDataBrasileira = (dataISO: string | undefined): string => {
  if (!dataISO) return '';
  
  // Remove a hora se existir (YYYY-MM-DDTHH:mm:ss → YYYY-MM-DD)
  const dataLimpa = dataISO.split('T')[0];
  
  // Divide em partes: YYYY-MM-DD
  const [ano, mes, dia] = dataLimpa.split('-');
  
  // Retorna em formato DD/MM/YYYY
  return `${dia}/${mes}/${ano}`;
};

/**
 * Converte data de formato brasileiro (DD/MM/YYYY) 
 * para formato ISO (YYYY-MM-DD)
 * @param dataBrasileira Data em formato DD/MM/YYYY
 * @returns Data em formato YYYY-MM-DD
 */
export const converterDataBrasileira = (dataBrasileira: string): string => {
  if (!dataBrasileira) return '';
  
  // Remove caracteres especiais
  const limpa = dataBrasileira.replace(/\D/g, '');
  
  if (limpa.length !== 8) return '';
  
  // Divide: DD MM YYYY (posições 0-1, 2-3, 4-7)
  const dia = limpa.substring(0, 2);
  const mes = limpa.substring(2, 4);
  const ano = limpa.substring(4, 8);
  
  // Retorna em formato YYYY-MM-DD
  return `${ano}-${mes}-${dia}`;
};
