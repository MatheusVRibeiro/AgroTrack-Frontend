import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  buttonClassName?: string;
  triggerDisabled?: boolean;
  disabled?: CalendarProps["disabled"];
  onOpenChange?: (open: boolean) => void;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Selecionar",
  buttonClassName,
  triggerDisabled,
  disabled,
  onOpenChange,
}: DatePickerProps) {
  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            buttonClassName
          )}
          disabled={triggerDisabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus disabled={disabled} />
      </PopoverContent>
    </Popover>
  );
}
