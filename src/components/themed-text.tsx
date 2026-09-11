import { Text, type TextProps } from 'react-native';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  className?: string;
};

const TYPE_CLASSES: Record<string, string> = {
  small: 'text-sm leading-5 font-medium',
  smallBold: 'text-sm leading-5 font-bold',
  default: 'text-base leading-6 font-medium',
  title: 'text-5xl font-semibold leading-[52px]',
  subtitle: 'text-3xl leading-[44px] font-semibold',
  link: 'text-sm leading-[30px]',
  linkPrimary: 'text-sm leading-[30px] text-blue-500',
  code: 'font-mono text-xs font-medium',
};

export function ThemedText({ style, type = 'default', themeColor, className = '', ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      className={`${TYPE_CLASSES[type] || TYPE_CLASSES.default} ${className}`}
      style={[{ color: theme[themeColor ?? 'text'] }, style]}
      {...rest}
    />
  );
}
