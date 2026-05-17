export function Btn(props: {
  title: any;
  onPress: any;
  variant?: string;
  testID?: string;
  disabled?: boolean;
  icon?: any;
  small?: boolean;
}): JSX.Element;

export function Input(props: {
  value: any;
  onChangeText: any;
  placeholder?: string;
  testID?: string;
  multiline?: boolean;
  keyboardType?: any;
  secureTextEntry?: boolean;
  [key: string]: any;
}): JSX.Element;

export function Card(props: {
  children: any;
  style?: any;
  testID?: string;
}): JSX.Element;

export function Sheet(props: {
  visible: boolean;
  onClose: any;
  title: any;
  children: any;
  testID?: string;
}): JSX.Element;

export function Chip(props: {
  label: any;
  active: any;
  onPress: any;
  color?: any;
}): JSX.Element;

export function EmptyState(props: {
  emoji?: string;
  title: string;
  subtitle?: string;
}): JSX.Element;

export function Toast(props: {
  toast: any;
}): JSX.Element;

export function Avatar(props: {
  photo?: any;
  name: any;
  size?: number;
  emoji?: any;
  badgeEmoji?: any;
  bgColor?: any;
}): JSX.Element;