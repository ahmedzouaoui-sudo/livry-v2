export type Role = 'Pickeur' | 'Admin';

export type Department =
  | 'Boulangerie et pâtisserie'
  | 'Fruits et légumes'
  | 'Boucherie et volaille'
  | 'Fromage et charcuterie';

export type BarcodeVariantType =
  | 'marjane'
  | 'marjane 2'
  | 'marjane Interne'
  | 'marjane mini'
  | 'marjane sec'
  | 'marjane sec 2'
  // Legacy aliases
  | 'barcodeMarjane'
  | 'barcodeP2'
  | 'barcodeInterne'
  | 'barcodeMiniSecours'
  | 'barcodeSecours'
  | 'barcodeP3';

export type BarcodeStatus = 'Valide' | 'Possible';

export interface BarcodeVariant {
  type: BarcodeVariantType;
  label: string;
  code: string;
  format: 'EAN-13' | 'EAN-8';
  status: BarcodeStatus;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  hasMarjaneIcon?: boolean;
  iconType?: 'marjane' | 'internet' | 'plus';
  canVote?: boolean;
  likes?: number;
  dislikes?: number;
  userVote?: 'like' | 'dislike' | null;
  isCommunityApproved?: boolean;
}

export interface BarcodeVoteRecord {
  barcode: string;
  likes: number;
  dislikes: number;
  voters: Record<string, 'like' | 'dislike'>; // voterId (IP or device ID) -> vote
  statusOverride?: BarcodeStatus; // 'Valide' if likes >= 15
  isDeleted?: boolean; // true if dislikes >= 15
  lastVoterIp?: string;
}

export interface Product {
  id: number;
  code: string; // code (ex: 6037, XXXX, -)
  name: string; // produit
  department: Department; // département
  category: string; // catégorie
  barcodeMarjane?: string; // marjane
  barcodeP2?: string; // marjane 2
  barcodeInterne?: string; // marjane Interne
  barcodeMiniSecours?: string; // marjane mini
  barcodeSecours?: string; // marjane sec
  barcodeP3?: string; // marjane sec 2
  imageUrl?: string; // image_html
  isEnabled: boolean;
  barcodeMjValide?: string; // alias
}

export interface DepartmentConfig {
  name: Department;
  shortName: string;
  icon: string;
  bgColor: string;
  accentColor: string;
  tagBg: string;
  tagText: string;
}

export type TipCategory =
  | 'Général'
  | 'Pesée & Balance'
  | 'Scanner & Caisse'
  | 'Fruits & Légumes'
  | 'Boucherie'
  | 'Fromage'
  | 'Boulangerie';

export interface TipPost {
  id: string;
  title: string;
  content: string;
  category: TipCategory;
  authorRole: string;
  authorName?: string;
  createdAt: string;
  likes: number;
  imageUrl?: string;
  targetAudience?: 'Tous' | 'Pickeur' | 'Livreur' | 'Référent';
}

export type DataUpdateStatus = 'up-to-date' | 'update-available' | 'updating';

export interface UserDevice {
  device_id: string;
  ip_address: string;
  device_type: string;
  device_brand?: string;
  user_agent: string;
  screen_size: string;
  first_seen_at: string;
  last_active_at: string;
  total_time_seconds: number;
  visits_count: number;
  is_online?: boolean;
  worker_number?: string;
  city?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  totalTimeSeconds: number;
  mobileCount: number;
  desktopCount: number;
}
