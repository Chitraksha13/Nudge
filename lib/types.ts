export type Profile = {
  id: string;
  name: string;
  venmo_username: string;
  cashtag: string;
  zelle_handle: string;
};
export type Household = { id: string; name: string; invite_code: string };
export type SplitMode = "equal" | "amounts" | "percent";
export type ShareStatus = "waiting" | "marked_paid" | "confirmed";
export type Bill = {
  id: string;
  household_id: string;
  name: string;
  total_amount: number; // integer cents
  paid_by: string; // profile id
  split_mode: SplitMode;
  created_at: number;
};
export type BillShare = {
  id: string;
  bill_id: string;
  profile_id: string;
  amount: number; // integer cents
  status: ShareStatus;
  paid_method: string | null;
  marked_paid_at: number | null;
  confirmed_at: number | null;
  last_reminded_at: number | null;
};
