import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import {
  User,
  FileText,
  CreditCard,
  ChevronLeft,
  School,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Student, Bulletin, Classe } from "../types";
import { EleveService } from "../services/eleveService";
import { BulletinService } from "../services/bulletinService";
import { ClasseService } from "../services/classeService";
import ResultatsCompositions from "../components/bulletins/primary";
import BulletinPage from "../components/bulletins/secondary";
import { SessionServices } from "../services/sessionServices";

type ActiveSection = "informations" | "finances" | "bulletins";

export function StudentDetails() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("informations");
  const [student, setStudent] = useState<Student | null>(null);
  const [classe, setClasse] = useState<Classe | null>(null);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [highlightedTrimester, setHighlightedTrimester] = useState<number | null>(null);

  const bulletinRef = useRef<HTMLDivElement>(null);

  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [eleveData, classesData, currentClasse] = await Promise.all([
        EleveService.getById(studentId),
        ClasseService.getAllClassesByUid(),
        EleveService.getClasseByStudentId(studentId),
      ]);
      setStudent(eleveData);
      setClasse(currentClasse);
      setClasses(classesData);
      // Auto-select the student's current class
      setSelectedClass(eleveData.classe_id);
      // Also set the cycle filter to match the student's current class niveau
      if (currentClasse?.niveau) {
        setSelectedCycle(currentClasse.niveau);
      }
    } catch (err) {
      console.error("Erreur chargement étudiant:", err);
      setError("Impossible de charger les données de l'élève.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch class data when selected class changes
  useEffect(() => {
    const fetchClassData = async () => {
      if (!selectedClass) return;
      try {
        const classData = await ClasseService.getById(selectedClass);
        setClasse(classData);
      } catch (e) {
        console.error("Erreur chargement classe:", e);
      }
    };
    fetchClassData();
  }, [selectedClass]);

  // Fetch bulletin when selected class changes (one bulletin per class)
  useEffect(() => {
    const fetchBulletin = async () => {
      if (!studentId || !selectedClass) return;
      try {
        // Get all bulletins for this student in this class
        const classData = await ClasseService.getById(selectedClass);
          const bulletin = await BulletinService.getByEleveAndClasse(
            String(studentId),
            String(classData.id),
          );
          setCurrentBulletin(bulletin ?? null);
          console.log("Fetched bulletin:", bulletin);
        
      } catch (e) {
        console.error("Erreur chargement bulletin:", e);
        setCurrentBulletin(null);
      }
    };
    fetchBulletin();
  }, [studentId, selectedClass]);

  // Function to refresh the current bulletin and student data
  const refreshBulletin = async () => {
    if (!studentId || !selectedClass) return;
    try {
      // Refresh student data to get updated moyenne attributes
      const [eleveData, classData] = await Promise.all([
        EleveService.getById(studentId),
        ClasseService.getById(selectedClass),
      ]);
      setStudent(eleveData);
      
      // if (classData?.trimester?.[0]?.id) {
        const bulletin = await BulletinService.getByEleveAndClasse(
          String(studentId),
          String(classData.id)
        );
        setCurrentBulletin(bulletin ?? null);
        console.log("Refreshed bulletin:", bulletin);
      // }
    } catch (e) {
      console.error("Erreur refresh bulletin:", e);
    }
  };

  if (loading)
    return <div className="p-6 text-center text-gray-500">Chargement...</div>;

  if (error)
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => (window.location.href = "/classes")}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ChevronLeft size={16} className="mr-2" />
          Retour
        </button>
      </div>
    );

  // Filter classes based on selected cycle
  const filteredClasses = classes.filter((cls) => {
    if (selectedCycle === "primaire") return cls.niveau === "primaire";
    if (selectedCycle === "college") return cls.niveau === "college";
    if (selectedCycle === "lycee") return cls.niveau === "lycee";
    if (selectedCycle === "maternelle") return cls.niveau === "maternelle";
    return true; // Show all if "all" is selected
  });

  // Resolve trimester code for secondary bulletin display
  const resolveTrimesterCode = (): string => {
    if (selectedClass && classe?.trimester) {
      const firstTrimester = classe.trimester[0];
      if (!firstTrimester) return "1er";
      const nom = firstTrimester.nom;
      if (nom?.includes("Premier") || nom?.includes("Niveau 1")) return "1er";
      if (nom?.includes("Deuxieme") || nom?.includes("Niveau 2")) return "2ème";
      if (nom?.includes("Troisieme") || nom?.includes("Niveau 3")) return "3ème";
    }
    return "1er";
  };

  // Function to export bulletin as PDF
  const exportToPDF = async () => {
    if (!bulletinRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `bulletin_${student?.nom}_${
        student?.prenom
      }_${resolveTrimesterCode()}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        windowWidth: document.documentElement.offsetWidth,
      },
      jsPDF: {
        unit: "pc" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
    };

    try {
      await html2pdf().set(opt).from(bulletinRef.current).save();
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
      alert("Erreur lors de la génération du PDF.");
    }
  };

  // Function to export bulletin as Word
  const exportToWord = () => {
    if (!bulletinRef.current) return;
    
    const content = bulletinRef.current.innerHTML;
    
    // Create a blob with HTML content that Word can open
    const blob = new Blob(
      [
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Bulletin de Notes</title>
            <style>
              body { font-family: 'Times New Roman', serif; margin: 1cm; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid black; padding: 4px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>`
      ],
      { type: "application/msword" }
    );
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bulletin_${student?.nom}_${student?.prenom}_${resolveTrimesterCode()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Function to export bulletin as Excel
  const exportToExcel = () => {
    if (!currentBulletin || !student) return;

    // Prepare data for Excel
    const data: any[] = [];
    
    // Header
    data.push(["BULLETIN DE NOTES - ANNÉE SCOLAIRE 2024-2025"]);
    data.push([]);
    data.push(["Élève:", `${student.prenom} ${student.nom}`]);
    data.push(["Classe:", student.classe.nom]);
    data.push(["Trimestre:", resolveTrimesterCode()]);
    data.push([]);
    
    // Add grades data if available
    if (currentBulletin.grades && currentBulletin.grades.length > 0) {
      data.push(["Matière", "Type", "Note", "Date"]);
      currentBulletin.grades.forEach((grade: any) => {
        data.push([
          grade.matiere?.nom || "",
          grade.type || "",
          grade.note || "",
          grade.date || ""
        ]);
      });
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Matière
      { wch: 15 }, // Type
      { wch: 10 }, // Note
      { wch: 12 }  // Date
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Bulletin");
    XLSX.writeFile(wb, `bulletin_${student.nom}_${student.prenom}_${resolveTrimesterCode()}.xlsx`);
  };

  async function handleCreateBulletin() {
    try {
      setLoading(true);
      if (!selectedClass || !classe) return;
      
      const firstTrimesterId = classe.trimester?.[0]?.id;

      await BulletinService.createBulletin(
        student?.id,
        String(selectedClass || student?.classe.id),
        // SessionServices.getSchoolId(),
        "2024-2025",
        new Date().toLocaleDateString("fr-FR")
      );
      // Refresh the bulletin without reloading the page
      await refreshBulletin();
    } catch (err) {
      console.error("Erreur lors de la création du bulletin:", err);
      alert("Erreur lors de la création du bulletin");
    } finally {
      setLoading(false);
    }
  }
  // console.log(resolveTrimesterCode());
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => (window.location.href = "/classes")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Détails de l'Élève
            </h1>
            <p className="text-gray-600">
              {student?.prenom} {student?.nom} • Classe {student?.classe?.nom}
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
            { key: "bulletins", label: "Bulletins", icon: FileText },
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
                  {student?.prenom?.charAt(0) ?? "?"}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {student?.prenom} {student?.nom}
                </h3>
                <p className="text-gray-600">Classe : {student?.classe?.nom}</p>
              </div>

              <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg border space-y-3">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  Informations personnelles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                  <p>
                    <strong>Sexe :</strong> {student?.sexe}
                  </p>
                  <p>
                    <strong>Matricule :</strong> {student?.matricule}
                  </p>
                  <p>
                    <strong>Date de naissance :</strong> {student?.birthday}
                  </p>
                  <p>
                    <strong>Lieu de naissance :</strong> {student?.birthplace}
                  </p>
                  {/* <p><strong>Adresse :</strong> {student?.address || "Non spécifiée"}</p> */}
                  {/* <p><strong>Tuteur :</strong> {student?. || "Non spécifié"}</p> */}
                  {/* <p><strong>Téléphone du tuteur :</strong> {student?.tuteur_tel || "Non spécifié"}</p> */}
                </div>
              </div>
            </div>
          )}

          {/* === 2️⃣ Suivi Financier === */}
          {activeSection === "finances" && (() => {
            const payments = student?.payments || [];
            const fraisClasse = student?.classe?.frais || 0;
            const totalToPay = fraisClasse;
            const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.somme || 0), 0);
            const remaining = totalToPay - totalPaid;

            // Format date function
            const formatDate = (dateStr: string) => {
              if (!dateStr) return 'N/A';
              try {
                if (dateStr.includes('/')) {
                  return dateStr;
                }
                const date = new Date(dateStr);
                return date.toLocaleDateString('fr-FR');
              } catch {
                return dateStr;
              }
            };

            // Get motif label
            const getMotifLabel = (motif: string) => {
              const motifMap: { [key: string]: string } = {
                'inscription': 'Inscription',
                'mensualite': 'Mensualité',
                'trimestre': 'Trimestre',
                'salaire': 'Salaire',
                'autre': 'Autre'
              };
              return motifMap[motif?.toLowerCase()] || motif || 'N/A';
            };

            return (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">
                    Situation financière
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Frais de la classe</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {fraisClasse.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total à payer</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {totalToPay.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Montant payé</p>
                      <p className="text-lg font-semibold text-green-600">
                        {totalPaid.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reste dû</p>
                      <p className={`text-lg font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {remaining.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-4">
                    Historique des paiements ({payments.length})
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
                              <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Enregistré par
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {payments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {formatDate(payment.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getMotifLabel(payment.motif || payment.type)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={payment.description || ''}>
                                  {payment.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right whitespace-nowrap">
                                  +{Number(payment.somme || 0).toLocaleString('fr-FR')} FCFA
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {payment.classe?.nom || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {payment.user 
                                    ? `${payment.user.nom}${payment.user.prenom ? ' ' + payment.user.prenom : ''}`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                Total payé:
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                                {totalPaid.toLocaleString('fr-FR')} FCFA
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <CreditCard size={48} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">Aucun paiement enregistré</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Aucun paiement n'a été enregistré pour cet élève.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* === 3️⃣ Bulletins === */}
          {activeSection === "bulletins" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrer par cycle
                  </label>
                  <select
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                  >
                    <option value="all">Tous les niveaux</option>
                    <option value="maternelle">Maternelle</option>
                    <option value="primaire">1er Cycle</option>
                    <option value="college">2ème Cycle</option>
                    <option value="lycee">Lycée</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <School size={18} className="text-blue-600" />
                  <select
                    value={selectedClass ?? ""}
                    onChange={(e) => setSelectedClass(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-1 text-sm flex-1"
                  >
                    {/* <option value="">Sélectionner une classe</option> */}
                    {filteredClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Export Buttons */}
              {currentBulletin && (
                <div className="flex justify-end gap-2 mb-4">
                  <button
                    onClick={exportToPDF}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Download size={18} className="mr-2" />
                    PDF
                  </button>
                  {/* <button
                    onClick={exportToWord}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText size={18} className="mr-2" />
                    Word
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileSpreadsheet size={18} className="mr-2" />
                    Excel
                  </button> */}
                </div>
              )}

              <div className="flex gap-4">
                {/* Color Highlight Controls - Outside bulletin for PDF */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-700">Colorier par trimestre:</span>
                  <button
                    onClick={() => setHighlightedTrimester(highlightedTrimester === 0 ? null : 0)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      highlightedTrimester === 0 
                        ? "bg-red-600 text-white" 
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    1er Trimestre
                  </button>
                  <button
                    onClick={() => setHighlightedTrimester(highlightedTrimester === 1 ? null : 1)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      highlightedTrimester === 1 
                        ? "bg-green-600 text-white" 
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    2ème Trimestre
                  </button>
                  <button
                    onClick={() => setHighlightedTrimester(highlightedTrimester === 2 ? null : 2)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      highlightedTrimester === 2 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    3ème Trimestre
                  </button>
                  <button
                    onClick={() => setHighlightedTrimester(null)}
                    className="px-3 py-2 rounded text-xs font-medium bg-gray-400 text-white hover:bg-gray-500 whitespace-nowrap"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div ref={bulletinRef} className="flex-1">
                {((typeof currentBulletin?.classe === 'object' && currentBulletin?.classe?.niveau) || classe?.niveau) === "lycee" ||
                ((typeof currentBulletin?.classe === 'object' && currentBulletin?.classe?.niveau) || classe?.niveau) === "college" ? (
                  currentBulletin ? (
                    <BulletinPage
                      etudiant={student}
                      classeT={selectedClass || Number(student?.classe.id)}
                      bulletin={currentBulletin}
                      onRefresh={refreshBulletin}
                      highlightedTrimester={highlightedTrimester}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="text-center space-y-2">
                        <p className="text-gray-600 text-base">
                          Aucun bulletin n'a été créé pour cet élève dans cette
                          classe et ce cycle.
                        </p>
                        <p className="text-sm text-gray-500">
                          Sélectionnez une autre classe ou cycle, ou créez un
                          nouveau bulletin.
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                        onClick={handleCreateBulletin}
                        disabled={loading}
                      >
                        <FileText size={18} className="mr-2" />
                        {loading ? "Création en cours..." : "Créer un bulletin"}
                      </button>
                    </div>
                  )
                ) : (
                  currentBulletin ? (
                  <ResultatsCompositions 
                    etudiant={student}
                    classeT={selectedClass || Number(student?.classe.id)}
                    bulletin={currentBulletin}
                    onRefresh={refreshBulletin}
                  />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="text-center space-y-2">
                        <p className="text-gray-600 text-base">
                          Aucun bulletin n'a été créé pour cet élève dans cette
                          classe et ce cycle.
                        </p>
                        <p className="text-sm text-gray-500">
                          Sélectionnez une autre classe ou cycle, ou créez un
                          nouveau bulletin.
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                        onClick={handleCreateBulletin}
                        disabled={loading}
                      >
                        <FileText size={18} className="mr-2" />
                        {loading ? "Création en cours..." : "Créer un bulletin"}
                      </button>
                    </div>
                  )
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
