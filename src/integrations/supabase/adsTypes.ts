import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";

// Tipos da migração 0005_advertising, separados do types.ts gerado pelo Lovable.

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type CampaignStatusStored = "draft" | "active" | "paused" | "archived";
export type RevenueType = "direct" | "sponsorship" | "affiliate";
export type LeadStatus = "new" | "contacted" | "closed" | "spam";

export type AdPlacementRow = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  desktop_width: number;
  desktop_height: number;
  mobile_width: number;
  mobile_height: number;
  adsense_enabled: boolean;
  adsense_slot: string | null;
  sort: number;
}

export type AdSettingsRow = {
  id: boolean;
  adsense_enabled: boolean;
  adsense_client: string | null;
  in_feed_interval: number;
  updated_at: string;
}

export type AdAdvertiserRow = {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type AdCampaignRow = {
  id: string;
  advertiser_id: string;
  name: string;
  placement_key: string;
  status: CampaignStatusStored;
  revenue_type: RevenueType;
  image_path: string;
  image_mobile_path: string | null;
  alt_text: string;
  target_url: string;
  starts_at: string;
  ends_at: string;
  weight: number;
  max_impressions: number | null;
  budget_cents: number | null;
  impressions_total: number;
  clicks_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AdStatsDailyRow = {
  campaign_id: string;
  day: string;
  placement_key: string;
  impressions: number;
  clicks: number;
}

export type AdLeadRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  status: LeadStatus;
  created_at: string;
}

export type AdLeadRecipientRow = {
  user_id: string;
  added_by: string | null;
  created_at: string;
};

export type ServedAd = {
  id: string;
  image_path: string;
  image_mobile_path: string | null;
  alt_text: string;
  target_url: string;
  advertiser_name: string;
  revenue_type: RevenueType;
}

type CampaignInsert = Omit<AdCampaignRow, "id" | "impressions_total" | "clicks_total" | "created_by" | "created_at" | "updated_at"> &
  Partial<Pick<AdCampaignRow, "id">>;

export type AdsDatabase = {
  public: {
    Tables: {
      ad_placements: Table<AdPlacementRow>;
      ad_settings: Table<AdSettingsRow>;
      ad_advertisers: Table<AdAdvertiserRow, Partial<AdAdvertiserRow> & { name: string }>;
      ad_campaigns: Table<AdCampaignRow, CampaignInsert>;
      ad_stats_daily: Table<AdStatsDailyRow>;
      ad_leads: Table<AdLeadRow>;
      ad_lead_recipients: Table<AdLeadRecipientRow, { user_id: string }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_ads_for_placement: { Args: { _placement: string; _count?: number }; Returns: ServedAd[] };
      record_ad_event: {
        Args: { _campaign_id: string; _placement: string; _kind: "impression" | "click"; _session: string };
        Returns: boolean;
      };
      submit_ad_lead: {
        Args: {
          _name: string;
          _company: string;
          _email: string;
          _phone: string;
          _interest: string;
          _message: string;
          _consent: boolean;
          _honeypot: string;
          _elapsed_ms: number;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Mesmo cliente (mesma sessão), tipado para as tabelas de publicidade. */
export const adsDb = supabase as unknown as SupabaseClient<AdsDatabase>;
