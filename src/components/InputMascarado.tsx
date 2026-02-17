import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  formatarCPF, 
  formatarTelefone, 
  formatarCEP, 
  formatarDocumento,
  apenasNumeros 
} from '@/utils/formatters';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tipoMascara?: 'cpf' | 'documento' | 'telefone' | 'cep' | 'numero';
  erro?: string;
}

export const InputMascarado: React.FC<InputProps> = ({ 
  label, 
  tipoMascara, 
  erro, 
  onChange, 
  value, 
  ...props 
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value;

    // Aplica a máscara em tempo real conforme o tipo
      if (tipoMascara === 'cpf') valor = formatarCPF(valor);
      if (tipoMascara === 'documento') valor = formatarDocumento(valor);
    if (tipoMascara === 'telefone') valor = formatarTelefone(valor);
    if (tipoMascara === 'cep') valor = formatarCEP(valor);
    if (tipoMascara === 'numero') valor = apenasNumeros(valor);

    // Cria um evento "falso" para o onChange do React continuar funcionando
    const novoEvento = {
      ...e,
      target: { ...e.target, value: valor, name: props.name || '' }
    };

    if (onChange) onChange(novoEvento as any);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{label}</Label>
      <Input
        {...props}
        value={value}
        onChange={handleChange}
        className={erro ? 'border-red-500 focus-visible:ring-red-500' : ''}
      />
      {erro && <p className="text-sm text-red-500 dark:text-red-400">{erro}</p>}
    </div>
  );
};
