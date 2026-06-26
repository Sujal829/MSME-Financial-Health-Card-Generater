const fs = require('fs');
const path = require('path');

function generateMockData() {
  const data = [];
  const months = [
    '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', 
    '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'
  ];

  // Helper to generate dates within a month
  const getDatesInMonth = (yearMonth) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const numDays = new Date(y, m, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `${yearMonth}-${day}`;
    });
  };

  // ==========================================
  // PROFILE 1: Rajesh Kirana Store (Healthy)
  // ==========================================
  const profile1 = {
    id: "msme_rajesh_kirana",
    name: "Rajesh Kirana Store",
    type: "Retail/Grocery",
    gstin: "27AAAAA1111A1Z1",
    pan: "ABCDE1234F",
    businessAgeMonths: 36,
    mcaStatus: "Active",
    geolocation: "Mumbai, Maharashtra (Commercial Zone)",
    upiData: [],
    gstData: [],
    bankStatement: {
      accountNumber: "919876543210",
      bankName: "State Bank of India",
      transactions: [],
      monthlySummary: []
    },
    epfoData: [],
    utilityBills: []
  };

  let prevBalance1 = 45000;
  months.forEach((month, mIdx) => {
    // GST - Healthy growth, timely filing
    const sales = 350000 + mIdx * 12000 + Math.random() * 20000;
    const purchases = sales * 0.75 + (Math.random() - 0.5) * 10000;
    const taxPaid = sales * 0.18 - purchases * 0.18;
    const fileOffset = Math.floor(Math.random() * 5); // 0 to 4 days delay
    profile1.gstData.push({
      month,
      sales: Math.round(sales),
      purchases: Math.round(purchases),
      taxPaid: Math.round(taxPaid),
      filingDate: `${month}-${String(10 + fileOffset).padStart(2, '0')}`,
      dueDate: `${month}-20`,
      lateDays: 0,
      status: "Filed"
    });

    // EPFO - Stable 4 employees
    profile1.epfoData.push({
      month,
      headcount: 4,
      totalWage: 68000,
      paymentDate: `${month}-07`,
      dueDate: `${month}-15`,
      lateDays: 0
    });

    // Utility - Regular electricity bills
    const utilAmount = 5000 + Math.random() * 1500;
    profile1.utilityBills.push({
      month,
      type: "Electricity",
      amount: Math.round(utilAmount),
      dueDate: `${month}-15`,
      paymentDate: `${month}-${String(12 + Math.floor(Math.random()*3)).padStart(2, '0')}`,
      status: "Paid"
    });

    // UPI & Bank - Generate weekly trends
    const dates = getDatesInMonth(month);
    let monthlyCredit = 0;
    let monthlyDebit = 0;
    let chequeBounces = 0;
    let autoDebitFailures = 0;

    // We simulate transactions across the month
    dates.forEach((date, dIdx) => {
      // Kirana store gets many small UPI transactions daily
      const dailyCount = 15 + Math.floor(Math.random() * 10);
      for (let i = 0; i < dailyCount; i++) {
        const amt = 50 + Math.floor(Math.random() * 600);
        profile1.upiData.push({
          date,
          amount: amt,
          type: "Credit",
          status: "Success",
          rating: (4.5 + Math.random() * 0.5).toFixed(1)
        });
        monthlyCredit += amt;
        profile1.bankStatement.transactions.push({
          date,
          amount: amt,
          type: "Credit",
          category: "UPI",
          description: "UPI/P2M/RetailPay"
        });
      }

      // Weekly salary/purchases/cash withdrawals
      if (dIdx % 7 === 0) {
        const cashWd = 8000 + Math.floor(Math.random() * 3000);
        monthlyDebit += cashWd;
        profile1.bankStatement.transactions.push({
          date,
          amount: cashWd,
          type: "Debit",
          category: "Cash",
          description: "Self Withdrawal"
        });
      }
    });

    // Monthly raw purchase payment and salary clearing from bank account
    const salaryDebit = 68000;
    const vendorDebit = Math.round(purchases * 0.9); // some credit terms
    monthlyDebit += salaryDebit + vendorDebit;
    profile1.bankStatement.transactions.push(
      { date: `${month}-07`, amount: salaryDebit, type: "Debit", category: "Salary", description: "EPFO Salaries" },
      { date: `${month}-12`, amount: vendorDebit, type: "Debit", category: "Vendor", description: "Supplier Settlement" }
    );

    const avgBal = prevBalance1 + (monthlyCredit - monthlyDebit) / 2;
    prevBalance1 = Math.max(10000, prevBalance1 + (monthlyCredit - monthlyDebit));
    
    profile1.bankStatement.monthlySummary.push({
      month,
      totalCredits: Math.round(monthlyCredit),
      totalDebits: Math.round(monthlyDebit),
      averageDailyBalance: Math.round(avgBal > 0 ? avgBal : 15000),
      chequeBounces,
      autoDebitFailures,
      cashWithdrawals: Math.round(12 * 9500),
      endBalance: Math.round(prevBalance1)
    });
  });

  // ==========================================
  // PROFILE 2: Kavita Fashion Boutique (Seasonal)
  // ==========================================
  const profile2 = {
    id: "msme_kavita_fashion",
    name: "Kavita Fashion Boutique",
    type: "Apparel/Retail",
    gstin: "27BBBBB2222B2Z2",
    pan: "FGHIJ5678K",
    businessAgeMonths: 24,
    mcaStatus: "Active",
    geolocation: "Pune, Maharashtra (Shopping Mall)",
    upiData: [],
    gstData: [],
    bankStatement: {
      accountNumber: "919654321098",
      bankName: "HDFC Bank",
      transactions: [],
      monthlySummary: []
    },
    epfoData: [],
    utilityBills: []
  };

  // Festive peak in Oct (Diwali), Nov, Dec, and marriage peak in May
  let prevBalance2 = 60000;
  months.forEach((month, mIdx) => {
    const isFestive = ['2025-10', '2025-11', '2025-12', '2026-05'].includes(month);
    const seasonMultiplier = isFestive ? 2.2 : 0.75;
    const baseSales = 220000;
    const sales = baseSales * seasonMultiplier + Math.random() * 30000;
    const purchases = sales * 0.55 + (Math.random() - 0.5) * 8000;
    const taxPaid = sales * 0.12 - purchases * 0.12;
    
    // GST late filing happens once during heavy load (October filed on 24th - 4 days late)
    const lateDays = (month === '2025-10') ? 4 : 0;
    profile2.gstData.push({
      month,
      sales: Math.round(sales),
      purchases: Math.round(purchases),
      taxPaid: Math.round(taxPaid),
      filingDate: `${month}-${lateDays > 0 ? '24' : '15'}`,
      dueDate: `${month}-20`,
      lateDays,
      status: "Filed"
    });

    // EPFO - 2 employees
    profile2.epfoData.push({
      month,
      headcount: 2,
      totalWage: 32000,
      paymentDate: `${month}-10`,
      dueDate: `${month}-15`,
      lateDays: 0
    });

    // Utility
    profile2.utilityBills.push({
      month,
      type: "Electricity",
      amount: Math.round(3500 * (isFestive ? 1.5 : 1.0)),
      dueDate: `${month}-15`,
      paymentDate: `${month}-14`,
      status: "Paid"
    });

    // UPI & Bank
    const dates = getDatesInMonth(month);
    let monthlyCredit = 0;
    let monthlyDebit = 0;
    
    dates.forEach((date, dIdx) => {
      // Boutique gets fewer but larger transactions
      const txCount = (isFestive ? 8 : 3) + Math.floor(Math.random() * 3);
      for (let i = 0; i < txCount; i++) {
        const amt = 800 + Math.floor(Math.random() * 3500);
        profile2.upiData.push({
          date,
          amount: amt,
          type: "Credit",
          status: "Success",
          rating: (4.2 + Math.random() * 0.8).toFixed(1)
        });
        monthlyCredit += amt;
        profile2.bankStatement.transactions.push({
          date,
          amount: amt,
          type: "Credit",
          category: "UPI",
          description: "UPI/MerchantPay/Apparel"
        });
      }

      // Occasional card payments/netbanking
      if (dIdx % 10 === 0) {
        const cardsCredit = 15000 + Math.random() * 10000;
        monthlyCredit += cardsCredit;
        profile2.bankStatement.transactions.push({
          date,
          amount: Math.round(cardsCredit),
          type: "Credit",
          category: "Card",
          description: "POS Settlements"
        });
      }
    });

    // Pay salaries & suppliers
    const salaryDebit = 32000;
    const vendorDebit = Math.round(purchases * 0.85);
    const cashWd = 20000; // Personal drawings
    monthlyDebit += salaryDebit + vendorDebit + cashWd;
    
    profile2.bankStatement.transactions.push(
      { date: `${month}-08`, amount: salaryDebit, type: "Debit", category: "Salary", description: "Salaries" },
      { date: `${month}-15`, amount: vendorDebit, type: "Debit", category: "Vendor", description: "Fabrics Wholesale" },
      { date: `${month}-22`, amount: cashWd, type: "Debit", category: "Cash", description: "Cash Drawings" }
    );

    const avgBal = prevBalance2 + (monthlyCredit - monthlyDebit) / 2;
    prevBalance2 = prevBalance2 + (monthlyCredit - monthlyDebit);
    
    profile2.bankStatement.monthlySummary.push({
      month,
      totalCredits: Math.round(monthlyCredit),
      totalDebits: Math.round(monthlyDebit),
      averageDailyBalance: Math.round(avgBal > 0 ? avgBal : 25000),
      chequeBounces: 0,
      autoDebitFailures: 0,
      cashWithdrawals: cashWd,
      endBalance: Math.round(prevBalance2)
    });
  });

  // ==========================================
  // PROFILE 3: Ananya Electronics (High Risk)
  // ==========================================
  const profile3 = {
    id: "msme_ananya_elec",
    name: "Ananya Electronics",
    type: "Retail/Consumer Durables",
    gstin: "27CCCCC3333C3Z3",
    pan: "KLMNO9012P",
    businessAgeMonths: 48,
    mcaStatus: "Active",
    geolocation: "Delhi (Industrial Hub)",
    upiData: [],
    gstData: [],
    bankStatement: {
      accountNumber: "919123456789",
      bankName: "ICICI Bank",
      transactions: [],
      monthlySummary: []
    },
    epfoData: [],
    utilityBills: []
  };

  // Declining revenues, poor cash management, bounces
  let prevBalance3 = 12000;
  months.forEach((month, mIdx) => {
    // Revenue declines month over month
    const baseRevenue = 400000;
    const sales = baseRevenue - mIdx * 18000 + (Math.random() - 0.5) * 20000;
    const purchases = sales * 0.85 + (Math.random() - 0.5) * 15000;
    const taxPaid = sales * 0.18 - purchases * 0.18;

    // Late GST filing starts becoming chronic in later months
    const lateDays = mIdx > 6 ? (5 + Math.floor(Math.random() * 12)) : 0;
    profile3.gstData.push({
      month,
      sales: Math.max(50000, Math.round(sales)),
      purchases: Math.max(40000, Math.round(purchases)),
      taxPaid: Math.round(taxPaid),
      filingDate: `${month}-${lateDays > 0 ? (20 + lateDays) : '18'}`,
      dueDate: `${month}-20`,
      lateDays,
      status: lateDays > 10 ? "Filed Late" : "Filed"
    });

    // EPFO - Shrinking headcount (starts with 8, declines to 3)
    const headcount = Math.max(3, 8 - Math.floor(mIdx / 2));
    const lateEpfo = mIdx > 8 ? 8 : 0;
    profile3.epfoData.push({
      month,
      headcount,
      totalWage: headcount * 15000,
      paymentDate: `${month}-${lateEpfo > 0 ? '25' : '12'}`,
      dueDate: `${month}-15`,
      lateDays: lateEpfo
    });

    // Utility - late payment or disconnected alerts
    const payDelay = mIdx > 8 ? 18 : 0;
    profile3.utilityBills.push({
      month,
      type: "Electricity",
      amount: Math.round(9000 - mIdx * 300),
      dueDate: `${month}-15`,
      paymentDate: `${month}-${payDelay > 0 ? '28' : '15'}`,
      status: payDelay > 10 ? "Paid with Penalty" : "Paid"
    });

    // UPI & Bank
    const dates = getDatesInMonth(month);
    let monthlyCredit = 0;
    let monthlyDebit = 0;
    let chequeBounces = mIdx > 6 ? (Math.random() > 0.4 ? 1 : 0) : 0;
    let autoDebitFailures = mIdx > 8 ? (Math.random() > 0.3 ? 2 : 0) : 0;

    dates.forEach((date, dIdx) => {
      // Lower number of UPI transactions, higher reliance on cash withdrawals
      if (dIdx % 3 === 0) {
        const amt = 2000 + Math.floor(Math.random() * 6000);
        profile3.upiData.push({
          date,
          amount: amt,
          type: "Credit",
          status: "Success",
          rating: "3.5"
        });
        monthlyCredit += amt;
        profile3.bankStatement.transactions.push({
          date,
          amount: amt,
          type: "Credit",
          category: "UPI",
          description: "UPI/Customer"
        });
      }

      // Large cash withdrawals
      if (dIdx % 5 === 0) {
        const cashWd = 25000;
        monthlyDebit += cashWd;
        profile3.bankStatement.transactions.push({
          date,
          amount: cashWd,
          type: "Debit",
          category: "Cash",
          description: "Cash Withdrawal ATM"
        });
      }
    });

    // Monthly debit for supplier (which sometimes bounces)
    const supplierDebit = Math.round(purchases * 0.9);
    monthlyDebit += supplierDebit + (headcount * 15000);

    profile3.bankStatement.transactions.push(
      { date: `${month}-10`, amount: supplierDebit, type: "Debit", category: "Vendor", description: "Vendor Payment ICICI" },
      { date: `${month}-12`, amount: headcount * 15000, type: "Debit", category: "Salary", description: "Payroll Transfer" }
    );

    // If cheque bounce simulated, record it in ledger
    if (chequeBounces > 0) {
      profile3.bankStatement.transactions.push({
        date: `${month}-14`,
        amount: 750,
        type: "Debit",
        category: "Penalty",
        description: "CHQ BOUNCE CHARGES"
      });
      monthlyDebit += 750;
    }

    if (autoDebitFailures > 0) {
      profile3.bankStatement.transactions.push({
        date: `${month}-25`,
        amount: 500,
        type: "Debit",
        category: "Penalty",
        description: "ECS/NACH DEBIT RETURN CHARGES"
      });
      monthlyDebit += 500;
    }

    const netChange = monthlyCredit - monthlyDebit;
    const avgBal = Math.max(1000, prevBalance3 + netChange * 0.2);
    prevBalance3 = prevBalance3 + netChange;
    // Keep balance from dropping to absolute negative in mock data
    if (prevBalance3 < 0) prevBalance3 = 2500;

    profile3.bankStatement.monthlySummary.push({
      month,
      totalCredits: Math.round(monthlyCredit),
      totalDebits: Math.round(monthlyDebit),
      averageDailyBalance: Math.round(avgBal),
      chequeBounces,
      autoDebitFailures,
      cashWithdrawals: Math.round(monthlyDebit * 0.45), // high cash leakage
      endBalance: Math.round(prevBalance3)
    });
  });

  // ==========================================
  // PROFILE 4: Apex Industrial Parts (Fraud / Collusive)
  // ==========================================
  const profile4 = {
    id: "msme_apex_parts",
    name: "Apex Industrial Parts",
    type: "Manufacturing/Engineering",
    gstin: "27DDDDD4444D4Z4",
    pan: "PQRST3456Q",
    businessAgeMonths: 12,
    mcaStatus: "Active",
    geolocation: "Chennai, Tamil Nadu (Industrial Estate)",
    upiData: [],
    gstData: [],
    bankStatement: {
      accountNumber: "919988776655",
      bankName: "Axis Bank",
      transactions: [],
      monthlySummary: []
    },
    epfoData: [],
    utilityBills: []
  };

  // High volume of transactions with circular partners, high sudden spike in credit before loan
  let prevBalance4 = 15000;
  months.forEach((month, mIdx) => {
    const isSpikePeriod = mIdx >= 10; // Last two months have massive spikes
    const sales = isSpikePeriod ? (900000 + Math.random() * 100000) : (180000 + Math.random() * 20000);
    const purchases = sales * 0.95; // very low value addition
    const taxPaid = sales * 0.18 - purchases * 0.18;

    profile4.gstData.push({
      month,
      sales: Math.round(sales),
      purchases: Math.round(purchases),
      taxPaid: Math.round(taxPaid),
      filingDate: `${month}-12`,
      dueDate: `${month}-20`,
      lateDays: 0,
      status: "Filed"
    });

    // EPFO - 0 or 1 employee (shell company pattern)
    profile4.epfoData.push({
      month,
      headcount: 1,
      totalWage: 12000,
      paymentDate: `${month}-05`,
      dueDate: `${month}-15`,
      lateDays: 0
    });

    // Utility - tiny bills for a "factory"
    profile4.utilityBills.push({
      month,
      type: "Electricity",
      amount: 1500, // extremely low, suspicious for manufacturing
      dueDate: `${month}-15`,
      paymentDate: `${month}-10`,
      status: "Paid"
    });

    // UPI & Bank
    // Simulating transactions with a SINGLE customer (collusive circular loop)
    const dates = getDatesInMonth(month);
    let monthlyCredit = 0;
    let monthlyDebit = 0;

    // A few massive credit payments from "Partner A"
    const txNum = isSpikePeriod ? 12 : 3;
    for (let i = 0; i < txNum; i++) {
      const creditAmt = isSpikePeriod ? (80000 + Math.floor(Math.random() * 20000)) : (60000 + Math.floor(Math.random() * 10000));
      monthlyCredit += creditAmt;
      profile4.bankStatement.transactions.push({
        date: dates[Math.floor(Math.random() * dates.length)],
        amount: creditAmt,
        type: "Credit",
        category: "NetBanking",
        description: "FT FROM SHREE SHYAM ENTERPRISES" // Single major client
      });

      // Immediately transferred back (Circular transactions)
      const debitAmt = creditAmt * 0.98; // leaving small margin
      monthlyDebit += debitAmt;
      profile4.bankStatement.transactions.push({
        date: dates[Math.floor(Math.random() * dates.length)],
        amount: Math.round(debitAmt),
        type: "Debit",
        category: "NetBanking",
        description: "FT TO TRIDENT LOGISTICS (Associate company)"
      });
    }

    const avgBal = prevBalance4 + 5000;
    prevBalance4 = prevBalance4 + (monthlyCredit - monthlyDebit);
    
    profile4.bankStatement.monthlySummary.push({
      month,
      totalCredits: Math.round(monthlyCredit),
      totalDebits: Math.round(monthlyDebit),
      averageDailyBalance: Math.round(avgBal),
      chequeBounces: 0,
      autoDebitFailures: 0,
      cashWithdrawals: 0,
      endBalance: Math.round(prevBalance4)
    });
  });

  data.push(profile1, profile2, profile3, profile4);

  // Write data to file
  const sharedDir = path.join(__dirname, '..', 'shared');
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  const filePath = path.join(sharedDir, 'mock_data.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Successfully generated mock data with ${data.length} profiles at ${filePath}`);
}

generateMockData();
