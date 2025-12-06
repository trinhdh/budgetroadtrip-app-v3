type Member = { id: string; name: string; avatar: string; email: string };
type Expense = { id: string; amount: number; paidBy: string; splitBy: string[] };
type Debt = { from: Member; to: Member; amount: number };

export function calculateDebts(members: Member[], expenses: Expense[]): Debt[] {
    const balances: Record<string, number> = {};

    // Initialize balances
    members.forEach(m => balances[m.id] = 0);

    // Calculate Net Balances
    expenses.forEach(exp => {
        const paidAmount = exp.amount;
        const splitCount = exp.splitBy.length;
        const amountPerPerson = paidAmount / splitCount;

        // The payer gets credit (+)
        if (balances[exp.paidBy] !== undefined) {
            balances[exp.paidBy] += paidAmount;
        }

        // The splitters get debit (-)
        exp.splitBy.forEach(memberId => {
            if (balances[memberId] !== undefined) {
                balances[memberId] -= amountPerPerson;
            }
        });
    });

    // Simplify Debts (Basic Algorithm)
    const debtors = members.filter(m => balances[m.id] < -0.01).sort((a, b) => balances[a.id] - balances[b.id]);
    const creditors = members.filter(m => balances[m.id] > 0.01).sort((a, b) => balances[b.id] - balances[a.id]);

    const debts: Debt[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        // The amount to settle is the minimum of what debtor owes and creditor is owed
        const amount = Math.min(Math.abs(balances[debtor.id]), balances[creditor.id]);

        debts.push({ from: debtor, to: creditor, amount });

        // Adjust remaining balances
        balances[debtor.id] += amount;
        balances[creditor.id] -= amount;

        // Move pointers if settled
        if (Math.abs(balances[debtor.id]) < 0.01) i++;
        if (balances[creditor.id] < 0.01) j++;
    }

    return debts;
}