import * as Icons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ICON_LIST = [
  'Sparkles','Gift','Mic','Bot','Bell','Heart','Star','ShoppingBag','ShoppingCart',
  'Tag','Percent','Crown','Trophy','Flame','Zap','Rocket','Award','Megaphone',
  'MessageCircle','MessageSquare','Mail','Phone','PhoneCall','HelpCircle','Info',
  'Search','Settings','User','Users','UserPlus','MapPin','Navigation','Headphones',
  'Music','Camera','Video','Image','PlayCircle','Calendar','Clock','Timer',
  'Truck','Package','Globe','Smile','ThumbsUp','Eye','BookOpen','Bookmark',
];

export function getIcon(name: string) {
  const I = (Icons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  return I || Icons.Sparkles;
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue>
          <span className="inline-flex items-center gap-2">
            {(() => { const I = getIcon(value); return <I className="h-4 w-4" />; })()}
            {value}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {ICON_LIST.map((n) => {
          const I = getIcon(n);
          return (
            <SelectItem key={n} value={n}>
              <span className="inline-flex items-center gap-2">
                <I className="h-4 w-4" /> {n}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
