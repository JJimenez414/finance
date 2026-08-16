export type Transaction = {
  id: string
  title: string
  subtitle: string
  amount: number
  time: string
}

export const ICON_OPTIONS = ['🏠', '🍔', '🚌', '💳', '🧾', '🎁', '💊', '🎮', '📚', '🐾', '✈️', '💰']

export const ICON_COLOR_OPTIONS = [
  'bg-blue-100',
  'bg-orange-100',
  'bg-emerald-100',
  'bg-violet-100',
  'bg-neutral-200',
  'bg-pink-100',
  'bg-amber-100',
  'bg-cyan-100',
]

export type Bucket = {
  id: string
  name: string
  subtitle: string
  icon: string
  iconBg: string
  budget: number
  spent: number
  changePercent: number
  changeSince: string
  monthlyAverage: number
  chart: { month: string; value: number }[]
  transactions: Transaction[]
}

/** A budget is a balance split across buckets. */
export type Budget = {
  id: string
  name: string
  balance: number
  buckets: Bucket[]
}

export const seedBuckets: Bucket[] = [
  {
    id: 'living',
    name: 'Living',
    subtitle: 'Rent, utilities, and everyday home costs 🏠',
    icon: '🏠',
    iconBg: 'bg-blue-100',
    budget: 2000,
    spent: 1450,
    changePercent: 6,
    changeSince: 'Jul',
    monthlyAverage: 1380,
    chart: [
      { month: 'Jan', value: 1300 },
      { month: 'Feb', value: 1350 },
      { month: 'Mar', value: 1320 },
      { month: 'Apr', value: 1400 },
      { month: 'May', value: 1420 },
      { month: 'Jun', value: 1450 },
    ],
    transactions: [
      { id: 't1', title: 'Rent payment', subtitle: 'Monthly rent', amount: 1100, time: '1st of month' },
      { id: 't2', title: 'Electricity bill', subtitle: 'Utility payment', amount: 210, time: 'Last week' },
      { id: 't3', title: 'Internet bill', subtitle: 'Utility payment', amount: 60, time: 'Mon' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    subtitle: 'Groceries, dining out, and takeout 🍔',
    icon: '🍔',
    iconBg: 'bg-orange-100',
    budget: 600,
    spent: 380,
    changePercent: 12,
    changeSince: 'Jun',
    monthlyAverage: 410,
    chart: [
      { month: 'Jan', value: 350 },
      { month: 'Feb', value: 390 },
      { month: 'Mar', value: 410 },
      { month: 'Apr', value: 380 },
      { month: 'May', value: 430 },
      { month: 'Jun', value: 440 },
    ],
    transactions: [
      { id: 't1', title: 'Grocery run', subtitle: 'Weekly groceries', amount: 95, time: '12.00 PM' },
      { id: 't2', title: 'Coffee shop', subtitle: 'Morning coffee', amount: 6, time: 'Yesterday' },
      { id: 't3', title: 'Dinner out', subtitle: 'With friends', amount: 42, time: 'Sat' },
    ],
  },
  {
    id: 'transportation',
    name: 'Transportation',
    subtitle: 'Gas, transit, and rideshares 🚌',
    icon: '🚌',
    iconBg: 'bg-emerald-100',
    budget: 300,
    spent: 150,
    changePercent: -4,
    changeSince: 'May',
    monthlyAverage: 160,
    chart: [
      { month: 'Jan', value: 140 },
      { month: 'Feb', value: 150 },
      { month: 'Mar', value: 130 },
      { month: 'Apr', value: 170 },
      { month: 'May', value: 180 },
      { month: 'Jun', value: 190 },
    ],
    transactions: [
      { id: 't1', title: 'Gas station', subtitle: 'Fuel top up', amount: 55, time: '9.00 AM' },
      { id: 't2', title: 'Metro pass', subtitle: 'Monthly transit', amount: 75, time: 'Last week' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    subtitle: 'Loans, subscriptions, and fees 💳',
    icon: '💳',
    iconBg: 'bg-violet-100',
    budget: 500,
    spent: 500,
    changePercent: 2,
    changeSince: 'Apr',
    monthlyAverage: 495,
    chart: [
      { month: 'Jan', value: 480 },
      { month: 'Feb', value: 490 },
      { month: 'Mar', value: 470 },
      { month: 'Apr', value: 500 },
      { month: 'May', value: 510 },
      { month: 'Jun', value: 520 },
    ],
    transactions: [
      { id: 't1', title: 'Loan payment', subtitle: 'Car loan', amount: 320, time: '3.00 PM' },
      { id: 't2', title: 'Subscriptions', subtitle: 'Streaming & apps', amount: 45, time: 'Mon' },
      { id: 't3', title: 'Bank fee', subtitle: 'Account maintenance', amount: 135, time: 'Last week' },
    ],
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    subtitle: 'Everything that doesn’t fit elsewhere 🧾',
    icon: '🧾',
    iconBg: 'bg-neutral-200',
    budget: 250,
    spent: 90,
    changePercent: -18,
    changeSince: 'Mar',
    monthlyAverage: 120,
    chart: [
      { month: 'Jan', value: 110 },
      { month: 'Feb', value: 130 },
      { month: 'Mar', value: 90 },
      { month: 'Apr', value: 100 },
      { month: 'May', value: 115 },
      { month: 'Jun', value: 95 },
    ],
    transactions: [{ id: 't1', title: 'Odds & ends', subtitle: 'Miscellaneous purchase', amount: 90, time: 'Wed' }],
  },
  {
    id: 'give',
    name: 'Give',
    subtitle: 'Donations and gifts to others 🎁',
    icon: '🎁',
    iconBg: 'bg-pink-100',
    budget: 200,
    spent: 200,
    changePercent: 25,
    changeSince: 'Feb',
    monthlyAverage: 180,
    chart: [
      { month: 'Jan', value: 150 },
      { month: 'Feb', value: 160 },
      { month: 'Mar', value: 170 },
      { month: 'Apr', value: 180 },
      { month: 'May', value: 190 },
      { month: 'Jun', value: 200 },
    ],
    transactions: [
      { id: 't1', title: 'Charity donation', subtitle: 'Monthly giving', amount: 150, time: '1st of month' },
      { id: 't2', title: 'Birthday gift', subtitle: 'For a friend', amount: 50, time: 'Last week' },
    ],
  },
]

export const seedBudgets: Budget[] = [{ id: 'personal', name: 'Personal', balance: 23400, buckets: seedBuckets }]
