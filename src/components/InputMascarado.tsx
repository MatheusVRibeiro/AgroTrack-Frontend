import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError, fieldErrorClass } from '@/components/shared/FieldError';
import { cn } from '@/lib/utils';
import { 
  formatarCPF, 
  formatarTelefone, 
  formatarCEP, 
  formatarDocumento,
  apenasNumeros,
  formatarToneladas,
  formatarValorPorTonelada
} from '@/utils/formatters';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tipoMascara?: 'cpf' | 'documento' | 'telefone' | 'cep' | 'numero' | 'toneladas' | 'valor-tonelada';
  erro?: string;
  onDetectTipoDocumento?: (tipo: 'cpf' | 'cnpj') => void;
}

export const InputMascarado: React.FC<InputProps> = ({ 
  label, 
  tipoMascara, 
  erro, 
  onChange, 
  value, 
  onDetectTipoDocumento,
  ...props 
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value;

    // Aplica a máscara em tempo real conforme o tipo
      if (tipoMascara === 'cpf') valor = formatarCPF(valor);
      if (tipoMascara === 'documento') {
        // Detecta dinamicamente CPF vs CNPJ durante digitação
        const limpo = apenasNumeros(valor);
        const tipoDetectado = limpo.length > 11 ? 'cnpj' : 'cpf';
        if (onDetectTipoDocumento) onDetectTipoDocumento(tipoDetectado);
        valor = formatarDocumento(valor);
      }
    if (tipoMascara === 'telefone') valor = formatarTelefone(valor);
    if (tipoMascara === 'cep') valor = formatarCEP(valor);
    if (tipoMascara === 'numero') valor = apenasNumeros(valor);
    if (tipoMascara === 'toneladas') valor = formatarToneladas(valor);
    if (tipoMascara === 'valor-tonelada') valor = formatarValorPorTonelada(valor);

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
        className={cn(props.className, fieldErrorClass(erro))}
      />
      <FieldError message={erro} />
    </div>
  );
};
