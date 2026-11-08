export type Profile = {
  id: string;
  name: string;
  venmo_username: string;
  cashtag: string;
  zelle_handle: string;
};
export type Household = {
  id: string;
  name: string;
  invite_code: string;
  nudge_every_days: number;
  emoji: string;
};
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

// One nudge covers everything a person owes someone in a group (never one per bill or per share).
export type Nudge = {
  id: string;
  household_id: string;
  from: string; // profile id of who is owed (the nudge is sent on their behalf)
  to: string; // profile id who receives the nudge
  share_ids: string[];
  bill_names: string[];
  amount: number; // integer cents, total across all those bills
  kind: "reminder" | "manual";
  note: string; // "First nudge" or "Previous nudge: 2 days ago"
  at: number;
};
