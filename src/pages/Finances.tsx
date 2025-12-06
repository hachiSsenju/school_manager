import { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { EcoleService } from '../services/ecoleServices';
import { SessionServices } from '../services/sessionServices';
import { Plus, Search, Edit, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Ecole, Student, Classe, Prof } from '../types';
import Swal from 'sweetalert2';

interface Payment {
  id: number | string;
  somme: number;
  description: string;
  type: string;
  date: string;
  eleve?: {
    id: number | string;
    nom: string;
    prenom?: string;
  };
  classe?: {
    id: number | string;
    nom: string;
  };
  user?: {
    id: number | string;
    nom: string;
    prenom?: string;
  };
  prof?: {
    id: number | string;
    nom: string;
    prenom?: string;
  } | null;
  ecole?: {
    id: number | string;
    nom: string;
  };
}

export default function Finances() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [school, setSchool] = useState<Ecole | null>(null);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    motif: 'autre' as 'inscription' | 'mensualite' | 'trimestre' | 'salaire' | 'autre' | string,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    eleve_id: '',
    classe_id: '',
    prof_id: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchSchool();
  }, []);

  useEffect(() => {
    let filtered = payments;

    // Filter by type (income/expense)
    if (filterType !== 'all') {
      filtered = filtered.filter((p) => {
        const paymentType = p.type?.toLowerCase() || '';
        if (filterType === 'income') {
          return paymentType.includes('revenus') ||
            paymentType.includes('revenu') ||
            paymentType === 'inscription' ||
            paymentType === 'mensualite' ||
            paymentType === 'trimestre';
        } else {
          return paymentType.includes('dépenses') ||
            paymentType.includes('depenses') ||
            paymentType.includes('dépense') ||
            paymentType.includes('depense') ||
            paymentType === 'salaire';
        }
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.eleve?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.classe?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.user?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.ecole?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  }, [searchTerm, filterType, payments]);

  const fetchPayments = async () => {
    try {
      const data = await paymentService.getAllPayments();
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchSchool = async () => {
    try {
      const schoolId = SessionServices.getSchoolId();
      if (schoolId) {
        const data = await EcoleService.getById(schoolId);
        setSchool(data);
      }
    } catch (error) {
      console.error('Error fetching school:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData = {
      somme: parseFloat(formData.amount),
      type: formData.type,
      motif: formData.motif,
      date: formData.date,
      description: formData.description || 'aucune description fournie',
      eleve_id: formData.eleve_id || null,
      classesId: formData.classe_id || null,
      prof_id: formData.prof_id || null,
    };

    try {
      if (editingPayment) {
        await paymentService.updatePayment(editingPayment.id.toString(), paymentData);
      } else {
        await paymentService.addPayment(paymentData);
      }

      setShowModal(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    // Determine if it's income or expense based on payment type
    const paymentTypeLower = payment.type?.toLowerCase() || '';
    const isExpense = paymentTypeLower.includes('dépenses') ||
      paymentTypeLower.includes('depenses') ||
      paymentTypeLower.includes('dépense') ||
      paymentTypeLower.includes('depense') ||
      paymentTypeLower === 'salaire';
    const isIncome = !isExpense && (paymentTypeLower.includes('revenus') ||
      paymentTypeLower.includes('revenu') ||
      paymentTypeLower === 'inscription' ||
      paymentTypeLower === 'mensualite' ||
      paymentTypeLower === 'trimestre');

    // Parse date - handle DD/MM/YYYY format
    const parseDateForInput = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      // If date is in DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      }
      // If date is in ISO format
      return dateStr.split('T')[0];
    };

    const motif = payment.type || 'autre';
    const motifLower = motif.toLowerCase();
    // Preserve custom motif values, or use the predefined value if it matches
    const motifValue = ['inscription', 'mensualite', 'trimestre', 'salaire', 'autre'].includes(motifLower)
      ? motifLower as 'inscription' | 'mensualite' | 'trimestre' | 'salaire' | 'autre'
      : motif; // Keep custom value as-is

    setFormData({
      type: isIncome ? 'income' : 'expense',
      motif: motifValue,
      amount: payment.somme?.toString() || '',
      description: payment.description || '',
      date: parseDateForInput(payment.date),
      eleve_id: payment.eleve?.id?.toString() || '',
      classe_id: payment.classe?.id?.toString() || '',
      prof_id: payment.prof?.id?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number | string) => {
    // Find the payment to check its date
    const payment: Payment = await paymentService.getbyId(id);
    if (!payment) return;

    // Parse the payment date
    const parsePaymentDate = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      // If date is in DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // If date is in ISO format
      return new Date(dateStr);
    };

    const paymentDate  = parsePaymentDate(payment.date);
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if the transaction is older than 3 days
    if (daysDifference < 3) {
      Swal.fire({
        title: "Suppression non autorisée",
        text: "Les transactions de moins de 3 jours ne peuvent pas être supprimées.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Compris"
      });
      return;
    }

    // Proceed with deletion if older than 3 days
    Swal.fire({
      title: "Etes vous sur?",
      text: "Toute transaction supprimée reste supprimée!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmer",
      cancelButtonText: "Annuler"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await paymentService.deletePayment(id.toString());
          fetchPayments();
          Swal.fire({
            title: "Transaction supprimée!",
            icon: "success"
          });
        } catch (error) {
          console.error('Error deleting payment:', error);
          Swal.fire({
            title: "Erreur",
            text: "Une erreur s'est produite lors de la suppression.",
            icon: "error"
          });
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      motif: 'autre',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      eleve_id: '',
      classe_id: '',
      prof_id: '',
    });
  };

  const getPaymentTypeLabel = (type: string) => {
    return type || 'N/A';
  };

  // Highlight search keyword in text
  const highlightText = (text: string, keyword: string): React.ReactNode => {
    if (!keyword || !text) return text;

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    const parts = text.split(regex);
    const keywordLower = keyword.toLowerCase();

    return parts.map((part, index) => {
      // Parts that match the regex will be exactly the keyword (case-insensitive)
      if (part.toLowerCase() === keywordLower) {
        return (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Calculate totals based on income/expense determination
  const totalIncome = payments.reduce((sum, p) => {
    const paymentType = p.type?.toLowerCase() || '';
    const isIncome = (paymentType.includes('revenus') ||
      paymentType.includes('revenu') ||
      paymentType === 'inscription' ||
      paymentType === 'mensualite' ||
      paymentType === 'trimestre') &&
      paymentType !== 'salaire';
    return isIncome ? sum + Number(p.somme || 0) : sum;
  }, 0);

  const totalExpenses = payments.reduce((sum, p) => {
    const paymentType = p.type?.toLowerCase() || '';
    const isExpense = paymentType.includes('dépenses') ||
      paymentType.includes('depenses') ||
      paymentType.includes('dépense') ||
      paymentType.includes('depense') ||
      paymentType === 'salaire';
    return isExpense ? sum + Number(p.somme || 0) : sum;
  }, 0);

  const balance = totalIncome - totalExpenses;

  const schoolStudents = school?.eleves || [];
  const schoolClasses = school?.classes || [];
  const schoolProfs = school?.professeurs || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Finances</h1>
        <button
          onClick={() => {
            setEditingPayment(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Ajouter une transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Revenus</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalIncome.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Dépenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalExpenses.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div
              className={`${balance >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                } p-3 rounded-lg`}
            >
              <TrendingUp
                className={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
                size={24}
              />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Solde NET</p>
              <p className="text-2xl font-bold text-gray-900">
                {balance.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Revenus
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterType === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Dépenses
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motif de payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Élève
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => {
                const paymentType = payment.type?.toLowerCase() || '';
                const isExpense = paymentType.includes('dépenses') ||
                  paymentType.includes('depenses') ||
                  paymentType.includes('dépense') ||
                  paymentType.includes('depense') ||
                  paymentType === 'salaire';
                const isIncome = !isExpense && (paymentType.includes('revenus') ||
                  paymentType.includes('revenu') ||
                  paymentType === 'inscription' ||
                  paymentType === 'mensualite' ||
                  paymentType === 'trimestre');

                // Parse date - handle both DD/MM/YYYY format and ISO format
                const formatDate = (dateStr: string) => {
                  if (!dateStr) return 'N/A';
                  // If date is in DD/MM/YYYY format
                  if (dateStr.includes('/')) {
                    return dateStr;
                  }
                  // If date is in ISO format
                  try {
                    return new Date(dateStr).toLocaleDateString('fr-FR');
                  } catch {
                    return dateStr;
                  }
                };

                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${isIncome
                            ? 'bg-green-100 text-green-800'
                            : isExpense
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {isIncome ? 'Revenu' : isExpense ? 'Dépense' : 'Autre'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {searchTerm
                        ? highlightText(getPaymentTypeLabel(payment.type), searchTerm)
                        : getPaymentTypeLabel(payment.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.eleve
                        ? (searchTerm
                          ? highlightText(`${payment.eleve.nom}${payment.eleve.prenom ? ' ' + payment.eleve.prenom : ''}`, searchTerm)
                          : `${payment.eleve.nom}${payment.eleve.prenom ? ' ' + payment.eleve.prenom : ''}`)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.classe?.nom
                        ? (searchTerm
                          ? highlightText(payment.classe.nom, searchTerm)
                          : payment.classe.nom)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.user
                        ? (searchTerm
                          ? highlightText(`${payment.user.nom}${payment.user.prenom ? ' ' + payment.user.prenom : ''}`, searchTerm)
                          : `${payment.user.nom}${payment.user.prenom ? ' ' + payment.user.prenom : ''}`)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {payment.description
                        ? (searchTerm
                          ? highlightText(payment.description, searchTerm)
                          : payment.description)
                        : '-'}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${isIncome ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-gray-600'
                        }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {Number(payment.somme || 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(payment)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id.toString())}
                        // onClick={()=>alert()}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-gray-500">Aucune transaction trouvée</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPayment ? 'Modifier une transaction' : 'Ajouter une transaction'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPayment(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="income">Revenu</option>
                    <option value="expense">Dépense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif *
                  </label>
                  <select
                    value={
                      ['inscription', 'mensualite', 'trimestre', 'salaire', 'autre'].includes(formData.motif)
                        ? formData.motif
                        : 'autre'
                    }
                    onChange={(e) => {
                      const selectedMotif = e.target.value as 'inscription' | 'mensualite' | 'trimestre' | 'salaire' | 'autre';
                      // Automatically set type to expense if salaire is selected
                      const newType = selectedMotif === 'salaire' ? 'expense' : formData.type;
                      // If selecting a predefined option, use it directly; if "autre", keep current custom value or set to "autre"
                      const motifValue = selectedMotif === 'autre'
                        ? (['inscription', 'mensualite', 'trimestre', 'salaire'].includes(formData.motif) ? 'autre' : formData.motif)
                        : selectedMotif;
                      setFormData({ ...formData, motif: motifValue, type: newType });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="inscription">Inscription</option>
                    <option value="mensualite">Mensualité</option>
                    <option value="trimestre">Trimestre</option>
                    <option value="salaire">Salaire</option>
                    <option value="autre">Autre</option>
                  </select>
                  {(!['inscription', 'mensualite', 'trimestre', 'salaire'].includes(formData.motif)) && (
                    <input
                      type="text"
                      required
                      placeholder="Saisir le motif manuellement"
                      value={formData.motif === 'autre' ? '' : formData.motif}
                      onChange={(e) => {
                        setFormData({ ...formData, motif: e.target.value || 'autre' });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Élève (optionnel)
                  </label>
                  <select
                    value={formData.eleve_id}
                    onChange={(e) => setFormData({ ...formData, eleve_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Aucun</option>
                    {schoolStudents.map((student: Student) => (
                      <option key={student.id} value={student.id}>
                        {student.nom} {student.prenom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classe (optionnel)
                  </label>
                  <select
                    value={formData.classe_id}
                    onChange={(e) => setFormData({ ...formData, classe_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Aucune</option>
                    {schoolClasses.map((classe: Classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professeur (optionnel)
                  </label>
                  <select
                    value={formData.prof_id}
                    onChange={(e) => setFormData({ ...formData, prof_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Aucun</option>
                    {schoolProfs.map((prof: Prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.nom} {prof.prenom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPayment(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingPayment ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
