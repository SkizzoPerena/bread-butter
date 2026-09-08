export interface QrOption {
  id: string
  label: string
  icon: string
  badgeText: string
  accountName: string
  accountNumber: string
  instructions: string
  logoText: string
}

export const PAYMENT_QR_OPTIONS: QrOption[] = [
  {
    id: 'gcash',
    label: 'GCash',
    icon: 'i-lucide-smartphone',
    badgeText: 'GCash QR',
    accountName: 'Bread + Butter Events',
    accountNumber: '0917 839 2883',
    instructions: 'Open your GCash app and scan this QR code',
    logoText: 'GCash',
  },
  {
    id: 'maya',
    label: 'Maya',
    icon: 'i-lucide-wallet',
    badgeText: 'Maya QR',
    accountName: 'Bread + Butter Events',
    accountNumber: '0918 920 1822',
    instructions: 'Open your Maya app and scan this QR code',
    logoText: 'Maya',
  },
  {
    id: 'qrph',
    label: 'Bank / QRPh',
    icon: 'i-lucide-landmark',
    badgeText: 'QRPh National Standard',
    accountName: 'Bread + Butter Events Inc.',
    accountNumber: 'BDO: 0012-3456-7890 / BPI: 1234-5678-90',
    instructions: 'Scan using BDO, BPI, UnionBank, or any QRPh banking app',
    logoText: 'QRPh',
  },
]

export const PAYMENT_QR_TABS = [
  { value: 'gcash', label: 'GCash', icon: 'i-lucide-smartphone' },
  { value: 'maya', label: 'Maya', icon: 'i-lucide-wallet' },
  { value: 'qrph', label: 'Bank / QRPh', icon: 'i-lucide-landmark' },
]
