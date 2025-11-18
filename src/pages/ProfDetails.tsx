import { useState, useEffect } from "react";
import {
  User,
  CreditCard,
  ChevronLeft,
  BookOpen,
  Phone,
  GraduationCap,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Prof, Classe, Matiere, Payment } from "../types";
import { ProfsService } from "../services/profsService";
import { EcoleService } from "../services/ecoleServices";
import { SessionServices } from "../services/sessionServices";
import { paymentService } from "../services/paymentService";

// Helper function to convert niveau code to display name
const getNiveauDisplayName = (niveau: string): string => {
  const niveauMap: { [key: string]: string } = {
    'maternelle': 'Maternelle',
    'primaire': '1er Cycle',
    'college': '2ème Cycle',
    'lycee': 'Lycée'
  };
  return niveauMap[niveau] || niveau;
};

type ActiveSection = "informations" | "finances" | "matieres";

export function ProfDetails() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("informations");
  const [prof, setProf] = useState<Prof | null>(null);
  const [school, setSchool] = useState<any | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const { id } = useParams<{ id: string }>();
  const profId = id;

  useEffect(() => {
    fetchProfData();
  }, [profId]);

  const fetchProfData = async () => {
    try {
      setLoading(true);
      const [profData, schoolData, paymentsData] = await Promise.all([
        ProfsService.getById(profId || ""),
        EcoleService.getById(SessionServices.getSchoolId()),
        paymentService.getAllPayments(),
      ]);
      setProf(profData);
      setSchool(schoolData);
      
      // Filter payments for this professor (where prof_id matches and motif is salaire)
      const profPayments = (paymentsData || []).filter(
        (p: Payment) => 
          p.prof?.id?.toString() === profId && 
          (p.motif?.toLowerCase() === 'salaire' || p.type?.toLowerCase() === 'salaire')
      );
      setPayments(profPayments);
    } catch (err) {
      console.error("Erreur chargement professeur:", err);
      setError("Impossible de charger les données du professeur.");
    } finally {
      setLoading(false);
    }
  };

  // Get classes where this professor is responsable
  const getClassesUnderTutelle = (): Classe[] => {
    if (!school?.classes) return [];
    return school.classes.filter((classe: Classe) =>
      classe.responsables?.some((r) => r.id === profId)
    );
  };

  if (loading)
    return <div className="p-6 text-center text-gray-500">Chargement...</div>;

  if (error)
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => (window.location.href = "/teachers")}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ChevronLeft size={16} className="mr-2" />
          Retour
        </button>
      </div>
    );

  const classesUnderTutelle = getClassesUnderTutelle();
  const totalSalaries = payments.reduce(
    (sum, payment) => sum + Number(payment.somme || 0),
    0
  );

  // Format date function
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      if (dateStr.includes("/")) {
        return dateStr;
      }
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR");
    } catch {
      return dateStr;
    }
  };

  // Get motif label
  const getMotifLabel = (motif: string) => {
    const motifMap: { [key: string]: string } = {
      inscription: "Inscription",
      mensualite: "Mensualité",
      trimestre: "Trimestre",
      salaire: "Salaire",
      autre: "Autre",
    };
    return motifMap[motif?.toLowerCase()] || motif || "N/A";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => (window.location.href = "/teachers")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Détails du Professeur
            </h1>
            <p className="text-gray-600">
              {prof?.prenom} {prof?.nom}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {[
            { key: "informations", label: "Informations", icon: User },
            { key: "finances", label: "Suivi Financier", icon: CreditCard },
            { key: "matieres", label: "Matières & Classes", icon: BookOpen },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key as ActiveSection)}
              className={`flex items-center px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeSection === key
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} className="mr-2" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* === 1️⃣ Informations Personnelles === */}
          {activeSection === "informations" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                  {prof?.prenom?.charAt(0) ?? "?"}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {prof?.prenom} {prof?.nom}
                </h3>
              </div>

              <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg border space-y-3">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  Informations personnelles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                  <p>
                    <strong>Nom :</strong> {prof?.nom}
                  </p>
                  <p>
                    <strong>Prénom :</strong> {prof?.prenom}
                  </p>
                  <p className="flex items-center">
                    <Phone size={16} className="mr-2" />
                    <strong>Téléphone :</strong> {prof?.telephone || "—"}
                  </p>
                  <p>
                    <strong>ID :</strong> {prof?.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* === 2️⃣ Suivi Financier === */}
          {activeSection === "finances" && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">
                  Situation financière
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total salaires reçus</p>
                    <p className="text-lg font-semibold text-green-600">
                      {totalSalaries.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nombre de paiements</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {payments.length}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-4">
                  Historique des salaires ({payments.length})
                </h4>
                {payments.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Motif
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Classe
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {payments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {formatDate(payment.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getMotifLabel(payment.motif || payment.type)}
                                </span>
                              </td>
                              <td
                                className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate"
                                title={payment.description || ""}
                              >
                                {payment.description || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right whitespace-nowrap">
                                +
                                {Number(payment.somme || 0).toLocaleString(
                                  "fr-FR"
                                )}{" "}
                                FCFA
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {payment.classe?.nom || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                            >
                              Total reçu:
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                              {totalSalaries.toLocaleString("fr-FR")} FCFA
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <CreditCard
                      size={48}
                      className="mx-auto text-gray-400 mb-3"
                    />
                    <p className="text-gray-600 font-medium">
                      Aucun salaire enregistré
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Aucun paiement de salaire n'a été enregistré pour ce
                      professeur.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === 3️⃣ Matières & Classes === */}
          {activeSection === "matieres" && (
            <div className="space-y-6">
              {/* Matières enseignées */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                  <BookOpen size={20} className="mr-2" />
                  Matières enseignées ({prof?.matieres?.length || 0})
                </h4>
                {prof?.matieres && prof.matieres.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Matière
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Classe
                            </th>
                            <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Coefficient
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {prof.matieres.map((matiere: Matiere) => (
                            <tr
                              key={matiere.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {matiere.nom}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {typeof matiere.classe === "object"
                                  ? matiere.classe.nom
                                  : matiere.classe || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {matiere.coefficient}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <BookOpen
                      size={48}
                      className="mx-auto text-gray-400 mb-3"
                    />
                    <p className="text-gray-600 font-medium">
                      Aucune matière assignée
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ce professeur n'enseigne actuellement aucune matière.
                    </p>
                  </div>
                )}
              </div>

              {/* Classes sous tutelle */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                  <GraduationCap size={20} className="mr-2" />
                  Classes sous tutelle ({classesUnderTutelle.length})
                </h4>
                {classesUnderTutelle.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classesUnderTutelle.map((classe: Classe) => (
                      <div
                        key={classe.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => (window.location.href = `/classes/${classe.id}`)}
                      >
                        <h5 className="font-medium text-gray-900 mb-2">
                          {classe.nom}
                        </h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <strong>Niveau:</strong> {getNiveauDisplayName(classe.niveau)}
                          </p>
                          <p>
                            <strong>Élèves:</strong> {classe.eleves?.length || 0}
                          </p>
                          <p>
                            <strong>Matières:</strong>{" "}
                            {classe.matieres?.length || 0}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <GraduationCap
                      size={48}
                      className="mx-auto text-gray-400 mb-3"
                    />
                    <p className="text-gray-600 font-medium">
                      Aucune classe sous tutelle
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ce professeur n'est responsable d'aucune classe.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

