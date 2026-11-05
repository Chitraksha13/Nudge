const enc = encodeURIComponent;
const dollars = (cents: number) => (cents / 100).toFixed(2);

// Venmo's documented payment-link format (venmo.com/paymentlinks): amount without "$", note URL-escaped.
export const venmoLink = (user: string, cents: number, note: string) =>
  `https://venmo.com/?txn=pay&recipients=${enc(user)}&amount=${dollars(cents)}&note=${enc(note)}`;
export const venmoProfile = (user: string) => `https://venmo.com/u/${enc(user)}`;
export const cashAppLink = (tag: string, cents: number) =>
  `https://cash.app/$${enc(tag)}/${dollars(cents)}`;
