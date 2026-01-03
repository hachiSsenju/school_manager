import { useEffect, useState } from 'react';
import { financesService } from '../services/financesService';
import { SessionServices } from '../services/sessionServices';
import { EleveService } from '../services/eleveService';
import { TrendingUp, TrendingDown, DollarSign, Filter, ArrowLeft } from 'lucide-react';

interface ClasseFinance {
    classe: {
        id: number;
        nom: string;
        frais: number;
        isActive: boolean;
        total_eleves: number;
    };
    estimated: number;
    payments: any[];
    paid_total: number;
    reliquat: number;
}

interface StudentFinanceStatus {
    id: number;
    nom: string;
    prenom: string;
    total_paid: number;
    reliquat: number;
    status: 'paid' | 'partial' | 'unpaid';
    payments_details: any[];
}

export default function SuiviFinancier() {
    const [financeData, setFinanceData] = useState<ClasseFinance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrimestre, setSelectedTrimestre] = useState<string>('all');

    // Detailed View State
    const [selectedClass, setSelectedClass] = useState<ClasseFinance['classe'] | null>(null);
    const [classStudentsStatus, setClassStudentsStatus] = useState<StudentFinanceStatus[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const schoolId = SessionServices.getSchoolId();
                if (schoolId) {
                    const data = await financesService.getAllByEcoleID(schoolId);
                    setFinanceData(data);
                }
            } catch (error) {
                console.error('Error fetching financial data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleClassClick = async (classe: ClasseFinance['classe']) => {
        setSelectedClass(classe);
        setLoadingDetails(true);
        try {
            // Fetch all students in the class
            const students = await EleveService.getByClasseId(classe.id);

            // Fetch detailed payments for the class (returns array of 3 arrays [T1, T2, T3])
            const paymentsByTrimestre = await financesService.getAllByClasseId(classe.id);

            // Flatten payments to easily sum them up per student
            const allPayments = paymentsByTrimestre.flat();

            const studentsStatus: StudentFinanceStatus[] = students.map((student: any) => {
                // Find all payments for this student
                // Check match by ID if available, or name/prenom fallback
                const studentPayments = allPayments.filter((p: any) =>
                    p.eleve && (p.eleve.id === student.id || (p.eleve.nom === student.nom && p.eleve.prenom === student.prenom))
                );

                const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + p.somme, 0);
                const reliquat = classe.frais - totalPaid;

                let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
                if (totalPaid >= classe.frais) {
                    status = 'paid';
                } else if (totalPaid > 0) {
                    status = 'partial';
                }

                return {
                    id: student.id,
                    nom: student.nom,
                    prenom: student.prenom,
                    total_paid: totalPaid,
                    reliquat: reliquat > 0 ? reliquat : 0,
                    status: status,
                    payments_details: studentPayments
                };
            });

            setClassStudentsStatus(studentsStatus);
        } catch (error) {
            console.error('Error fetching class details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBack = () => {
        setSelectedClass(null);
        setClassStudentsStatus([]);
    };

    // Calculate processed data based on filter
    const processedData = financeData.map(item => {
        if (selectedTrimestre === 'all') {
            return item;
        }

        const trimestreValue = parseInt(selectedTrimestre);

        const filteredPayments = item.payments.filter((p: any) => p.trimestre === trimestreValue);
        const filteredPaidTotal = filteredPayments.reduce((sum: number, p: any) => sum + p.somme, 0);

        return {
            ...item,
            paid_total: filteredPaidTotal,
            reliquat: item.estimated - filteredPaidTotal
        };
    });

    const totalEstimated = processedData.reduce((acc, curr) => acc + curr.estimated, 0);
    const totalPaid = processedData.reduce((acc, curr) => acc + curr.paid_total, 0);
    const totalReliquat = processedData.reduce((acc, curr) => acc + curr.reliquat, 0);

    if (selectedClass) {
        return (
            <div>
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{selectedClass.nom} - Détails financiers</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nom complet
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payé
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reste à payer
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loadingDetails ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                            Chargement des détails...
                                        </td>
                                    </tr>
                                ) : classStudentsStatus.length > 0 ? (
                                    classStudentsStatus.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.nom} {student.prenom}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                                    ${student.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        student.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                    {student.status === 'paid' ? 'Payé' : student.status === 'partial' ? 'Partiel' : 'Non payé'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                                {student.total_paid.toLocaleString('fr-FR')} FCFA
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                                                {student.reliquat.toLocaleString('fr-FR')} FCFA
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                            Aucun élève trouvé dans cette classe
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Suivi des paiements</h1>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <Filter size={20} className="text-gray-500" />
                    <select
                        className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium"
                        value={selectedTrimestre}
                        onChange={(e) => setSelectedTrimestre(e.target.value)}
                    >
                        <option value="all">Tous les trimestres</option>
                        <option value="0">1er Trimestre</option>
                        <option value="1">2ème Trimestre</option>
                        <option value="2">3ème Trimestre</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <DollarSign className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Total Estimé</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {totalEstimated.toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-green-100 p-3 rounded-lg">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Total Payé</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {totalPaid.toLocaleString('fr-FR')} FCFA
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
                            <p className="text-gray-500 text-sm">Reste à Payer (Reliquat)</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {totalReliquat.toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Classe
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Effectif
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Frais de scolarité
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estimé
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payé {selectedTrimestre !== 'all' && `(T${parseInt(selectedTrimestre) + 1})`}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reliquat
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        Chargement...
                                    </td>
                                </tr>
                            ) : processedData.length > 0 ? (
                                processedData.map((item) => (
                                    <tr
                                        key={item.classe.id}
                                        onClick={() => handleClassClick(item.classe)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                                            {item.classe.nom}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {item.classe.total_eleves}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {item.classe.frais.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                            {item.estimated.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                            {item.paid_total.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                                            {item.reliquat.toLocaleString('fr-FR')} FCFA
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        Aucune donnée disponible
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right">{processedData.reduce((acc, curr) => acc + curr.classe.total_eleves, 0)}</td>
                                <td className="px-6 py-4 text-right">-</td>
                                <td className="px-6 py-4 text-right">{totalEstimated.toLocaleString('fr-FR')} FCFA</td>
                                <td className="px-6 py-4 text-right text-green-600">{totalPaid.toLocaleString('fr-FR')} FCFA</td>
                                <td className="px-6 py-4 text-right text-red-600">{totalReliquat.toLocaleString('fr-FR')} FCFA</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
