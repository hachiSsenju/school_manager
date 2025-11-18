import { useEffect, useState } from "react";
import {
  GraduationCap,
  School,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AuthService } from "../services/authService";
import { SessionServices } from "../services/sessionServices";
import { EcoleService } from "../services/ecoleServices";
import { paymentService } from "../services/paymentService";
import { Classe, Student } from "../types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Payment {
  id: number | string;
  somme: number;
  description: string;
  type: string;
  date: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Student[]>([]);
  const [profs, setProfs] = useState<Student[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    fetchStats();
    fetchPayments();
  }, []);
  useEffect(() => {
    const getMe = async () => {
      const user = await AuthService.me();
      // setLoggedUser(user);
      SessionServices.saveUser(user);
    };
    getMe();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await EcoleService.getById(
        SessionServices.getSchoolId()
      );
      if (response) {
        setClasses(response.classes);
        setEleves(response.eleves);
        setProfs(response.professeurs);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await paymentService.getAllPayments();
      calculateFinancials(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const isIncome = (paymentType: string): boolean => {
    const type = paymentType?.toLowerCase() || "";
    return (
      type.includes("revenus") ||
      type.includes("revenu") ||
      type === "inscription" ||
      type === "mensualite" ||
      type === "trimestre"
    );
  };

  const isExpense = (paymentType: string): boolean => {
    const type = paymentType?.toLowerCase() || "";
    return (
      type.includes("dépenses") ||
      type.includes("depenses") ||
      type.includes("dépense") ||
      type.includes("depense") ||
      type === "salaire"
    );
  };

  const calculateFinancials = (paymentsData: Payment[]) => {
    // Calculate total income and expenses
    let income = 0;
    let expenses = 0;

    paymentsData.forEach((payment) => {
      const amount = Number(payment.somme || 0);
      if (isIncome(payment.type)) {
        income += amount;
      } else if (isExpense(payment.type)) {
        expenses += amount;
      }
    });

    setTotalIncome(income);
    setTotalExpenses(expenses);

    // Calculate monthly data for the last 6 months
    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    // Get last 6 months
    const last6Months: MonthlyData[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthlyMap.set(monthKey, { income: 0, expenses: 0 });
      last6Months.push({ month: monthKey, income: 0, expenses: 0 });
    }

    // Process payments and group by month
    paymentsData.forEach((payment) => {
      const amount = Number(payment.somme || 0);
      if (amount === 0 || !payment.date) return;

      let paymentDate: Date;
      try {
        // Handle different date formats
        if (typeof payment.date === 'string' && payment.date.includes("/")) {
          const parts = payment.date.split("/");
          if (parts.length === 3) {
            const [day, month, year] = parts;
            paymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            paymentDate = new Date(payment.date);
          }
        } else {
          paymentDate = new Date(payment.date);
        }
        
        // Check if date is valid
        if (isNaN(paymentDate.getTime())) {
          return; // Skip invalid dates
        }
      } catch {
        return; // Skip invalid dates
      }

      const monthKey = `${months[paymentDate.getMonth()]} ${paymentDate.getFullYear()}`;
      const currentData = monthlyMap.get(monthKey);

      if (currentData) {
        if (isIncome(payment.type)) {
          currentData.income += amount;
        } else if (isExpense(payment.type)) {
          currentData.expenses += amount;
        }
        monthlyMap.set(monthKey, currentData);
      }
    });

    // Update last6Months with actual data
    last6Months.forEach((monthData) => {
      const data = monthlyMap.get(monthData.month);
      if (data) {
        monthData.income = data.income;
        monthData.expenses = data.expenses;
      }
    });

    setMonthlyData(last6Months);
  };

  const balance = totalIncome - totalExpenses;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Élèves",
      value: eleves.length,
      icon: GraduationCap,
      color: "bg-blue-500",
    },
    {
      title: "Classes",
      value: classes.length,
      icon: School,
      color: "bg-green-500",
    },
    {
      title: "Professeurs",
      value: profs.length,
      icon: Users,
      color: "bg-orange-500",
    },
    {
      title: "Balance",
      value: formatCurrency(balance),
      icon: DollarSign,
      color: balance >= 0 ? "bg-emerald-500" : "bg-red-500",
    },
  ];

  // Pie chart data
  const pieData = [
    { name: "Revenus", value: totalIncome, color: "#10b981" },
    { name: "Dépenses", value: totalExpenses, color: "#ef4444" },
  ].filter(item => item.value > 0); // Only show non-zero values

  const COLORS = ["#10b981", "#ef4444"];
  const hasFinancialData = totalIncome > 0 || totalExpenses > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenus</h2>
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={32} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-gray-500 text-sm">Total des revenus</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dépenses</h2>
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={32} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalExpenses)}
              </p>
              <p className="text-gray-500 text-sm">Total des dépenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart - Monthly Income vs Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Revenus vs Dépenses (6 derniers mois)
          </h2>
          {hasFinancialData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Revenus" />
                <Bar dataKey="expenses" fill="#ef4444" name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <p>Aucune donnée financière disponible</p>
            </div>
          )}
        </div>

        {/* Pie Chart - Income vs Expenses Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Répartition Revenus / Dépenses
          </h2>
          {hasFinancialData && pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <p>Aucune donnée financière disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
