import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import {
  Plus,
  Users,
  BookOpen,
  FileText,
  ChevronLeft,
  Calendar,
  User,
  Download,
  FileSpreadsheet,
  Edit,
  Trash2,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Classe, Student, Matiere, Bulletin, Prof, Ecole } from "../types";
import { ClasseService } from "../services/classeService";
import { EleveService } from "../services/eleveService";
import { MatiereService } from "../services/matiereService";
import { BulletinService } from "../services/bulletinService";
import { EcoleService } from "../services/ecoleServices";
import { SessionServices } from "../services/sessionServices";
import ResultatsCompositions from "../components/bulletins/primary";
import BulletinPage from "../components/bulletins/secondary";

type ActiveSection = "matieres" | "eleves" | "bulletins";

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

export function ClassDetails() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("eleves");
  const [classe, setClasse] = useState<Classe | null>(null);
  const [eleves, setEleves] = useState<Student[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState<string>("");
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [school, setSchool] = useState<Ecole | null>(null);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [coefficientValue, setCoefficientValue] = useState<string>("");
  const [highlightedTrimester, setHighlightedTrimester] = useState<number | null>(null);
  const coefficientInputRef = useRef<HTMLInputElement>(null);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const classId = Number(useParams().id);

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const schoolId = SessionServices.getSchoolId();
        if (schoolId) {
          const schoolData = await EcoleService.getById(schoolId);
          setSchool(schoolData);
          setProfs(schoolData.professeurs || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'école:", err);
      }
    };
    fetchSchoolData();
  }, []);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const [classData, studentsData, subjectsData] =
        await Promise.all([
          ClasseService.getById(classId),
          EleveService.getByClasseId(classId),
          ClasseService.getMatieresByClasse(classId),
        ]);

      setClasse(classData);
      setEleves(studentsData || []);
      setMatieres(subjectsData || []);

      // Set default student and trimester if available
      if (studentsData && studentsData.length > 0) {
        setSelectedStudent(studentsData[0].id);
      }
      if (classData?.trimester?.[0]?.id) {
        setSelectedTrimester(String(classData.trimester[0].id));
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Impossible de charger les données de la classe");
    } finally {
      setLoading(false);
    }
  };

  // Function to generate unique matricule
  const generateMatricule = (nom: string, prenom: string, birthday: string): string => {
    // Format: First 2 letters of last name + first 2 letters of first name + last 2 digits of birth year + random 2 digits
    const nomPrefix = nom.substring(0, 2).toUpperCase();
    const prenomPrefix = prenom.substring(0, 2).toUpperCase();
    const birthYear = new Date(birthday).getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');

    const baseMatricule = `${nomPrefix}${prenomPrefix}${birthYear}${randomNum}`;

    // Check if matricule already exists (check against all school students)
    const existingMatricules = school?.eleves?.map(s => s.matricule).filter(Boolean) || [];

    if (existingMatricules.includes(baseMatricule)) {
      // Add additional random digits if exists
      const extraRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${baseMatricule}${extraRandom}`;
    }

    return baseMatricule;
  };

  // Fetch current student data when selected
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudent) return;
      try {
        const studentData = await EleveService.getById(selectedStudent);
        setCurrentStudent(studentData);
      } catch (e) {
        console.error("Erreur chargement étudiant:", e);
      }
    };
    fetchStudentData();
  }, [selectedStudent]);

  // Fetch bulletin when student or trimester changes
  useEffect(() => {
    const fetchBulletin = async () => {
      if (!selectedStudent || !classId) return;
      try {
        // Use getByEleveAndClasse to get bulletin with cycles, rank, and moyenne
        const bulletin = await BulletinService.getByEleveAndClasse(
          String(selectedStudent),
          String(classId)
        );
        setCurrentBulletin(bulletin ?? null);
        console.log("Fetched bulletin:", bulletin);
      } catch (e) {
        console.error("Erreur chargement bulletin:", e);
        setCurrentBulletin(null);
      }
    };
    fetchBulletin();
  }, [selectedStudent, classId]);

  const handleAddItem = async (
    formData: FormData,
    type: "eleve" | "matiere"
  ) => {
    try {
      if (type === "eleve") {
        const nom = formData.get("lastName") as string;
        const prenom = formData.get("firstName") as string;
        const birthday = formData.get("dateOfBirth") as string;

        await EleveService.addEleve({
          nom: nom,
          prenom: prenom,
          birthday: birthday,
          birthplace: formData.get("birthplace") as string,
          sexe: formData.get("sexe") as string,
          matricule: generateMatricule(nom, prenom, birthday),
          classe_id: String(classId),
          email_parent: formData.get("parentEmail") || undefined,
          ecole_id: SessionServices.getSchoolId(),
        });
      } else {
        if (isEditMode && editingMatiere) {
          await MatiereService.updateMatiere(Number(editingMatiere.id), {
            nom: formData.get("nom") as string,
            coefficient: Number(formData.get("coefficient")),
            professeur_id: formData.get("professeur_id") as string,
            classe_id: classId,
          });
        } else {
          await MatiereService.addMatiere({
            nom: formData.get("nom") as string,
            coefficient: Number(formData.get("coefficient")),
            professeur_id: formData.get("professeur_id") as string,
            classe_id: classId,
          });
        }
      }

      await fetchClassData();
      setShowAddForm(false);
      setIsEditMode(false);
      setEditingMatiere(null);
      setCoefficientValue("");
      setShowKeyboard(false);
    } catch (err) {
      console.error(`Erreur lors de l'ajout:`, err);
      setError(
        `Ajout ${type === "eleve" ? "de l'élève" : "de la matière"} échoué`
      );
    }
  };

  const handleEditMatiere = (matiere: Matiere) => {
    setEditingMatiere(matiere);
    setCoefficientValue(String(matiere.coefficient || ""));
    setIsEditMode(true);
    setShowAddForm(true);
  };

  const handleDeleteMatiere = async (matiereId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette matière ?")) {
      return;
    }
    try {
      await MatiereService.deleteMatiere(Number(matiereId));
      await fetchClassData();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Suppression de la matière échouée");
    }
  };

  // Function to refresh bulletin and student data
  const refreshBulletin = async () => {
    if (!selectedStudent || !classId) return;
    try {
      // Refresh student data to get updated moyenne attributes
      const [studentData, classData] = await Promise.all([
        EleveService.getById(selectedStudent),
        ClasseService.getById(classId),
      ]);
      setCurrentStudent(studentData);

      // Use getByEleveAndClasse to get bulletin with cycles, rank, and moyenne
      const bulletin = await BulletinService.getByEleveAndClasse(
        String(selectedStudent),
        String(classData.id)
      );
      setCurrentBulletin(bulletin ?? null);
      console.log("Refreshed bulletin:", bulletin);
    } catch (e) {
      console.error("Erreur refresh bulletin:", e);
    }
  };

  // Resolve trimester code for display ("1er", "2ème", "3ème")
  const resolveTrimesterCode = (): string => {
    if (!classe?.trimester) return "1er";
    const selected = classe.trimester.find(
      (t: any) => String(t.id) === String(selectedTrimester)
    );
    if (!selected) return "1er";
    if (selected.nom?.includes("Premier")) return "1er";
    if (selected.nom?.includes("Deuxieme")) return "2ème";
    if (selected.nom?.includes("Troisieme")) return "3ème";
    return "1er";
  };

  const exportToPDF = async () => {
    if (!bulletinRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `bulletin_${currentStudent?.nom ?? "unknown"}_${currentStudent?.prenom ?? ""}_${resolveTrimesterCode()}.pdf`,
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
    link.download = `bulletin_${currentStudent?.nom}_${currentStudent?.prenom}_${resolveTrimesterCode()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Function to export bulletin as Excel
  const exportToExcel = () => {
    if (!currentBulletin || !currentStudent) return;

    // Prepare data for Excel
    const data: any[] = [];

    // Header
    data.push(["BULLETIN DE NOTES - ANNÉE SCOLAIRE 2024-2025"]);
    data.push([]);
    data.push(["Élève:", `${currentStudent.prenom} ${currentStudent.nom}`]);
    data.push(["Classe:", currentStudent.classe?.nom || ""]);
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
    XLSX.writeFile(wb, `bulletin_${currentStudent.nom}_${currentStudent.prenom}_${resolveTrimesterCode()}.xlsx`);
  };

  // Function to create a new bulletin
  const handleCreateBulletin = async () => {
    try {
      setLoading(true);
      await BulletinService.createBulletin(
        selectedStudent ? String(selectedStudent) : undefined,
        String(classId),
        selectedTrimester,
        "2024-2025",

      );
      // Refresh the bulletin
      await refreshBulletin();
    } catch (err) {
      console.error("Erreur lors de la création du bulletin:", err);
      alert("Erreur lors de la création du bulletin");
    } finally {
      setLoading(false);
    }
  };

  const sectionHeaders = [
    { key: "eleves" as ActiveSection, label: "Élèves", icon: Users },
    { key: "matieres" as ActiveSection, label: "Matières", icon: BookOpen },
    { key: "bulletins" as ActiveSection, label: "Bulletins", icon: FileText },
  ];

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => {
            window.location.href = "/classes";
          }}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ChevronLeft size={16} className="mr-2" />
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              window.location.href = "/classes";
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classe?.nom} - {getNiveauDisplayName(classe?.niveau || "")}
            </h1>
            <p className="text-gray-600">
              {eleves.length} élève{eleves.length > 1 ? "s" : ""} •{" "}
              {matieres.length} matière{matieres.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Display Responsables for primaire and maternelle */}
      {(classe?.niveau === "primaire" || classe?.niveau === "maternelle") && classe?.responsables && classe.responsables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <User size={18} className="mr-2" />
            Professeurs Responsables
          </h3>
          <div className="flex flex-wrap gap-2">
            {classe.responsables.map((prof) => (
              <span
                key={prof.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
              >
                {prof.nom} {prof.prenom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {sectionHeaders.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeSection === key
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
            >
              <Icon size={18} className="mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Section Header with Add Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeSection === "eleves" && "Liste des Élèves"}
              {activeSection === "matieres" && "Liste des Matières"}
              {activeSection === "bulletins" && "Gestion des Bulletins"}
            </h2>
            {activeSection !== "bulletins" && (
              <button
                onClick={() => {
                  setCoefficientValue("");
                  setShowKeyboard(false);
                  setShowAddForm(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Ajouter
              </button>
            )}
          </div>

          {/* Students Table */}
          {activeSection === "eleves" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Nom
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Prénom
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Date de naissance
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((eleve) => (
                    <tr key={eleve.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {eleve.nom}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {eleve.prenom}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {new Date(eleve.birthday).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        -
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subjects Table */}
          {activeSection === "matieres" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Matière
                    </th>
                    {/* <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Description
                    </th> */}
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Coefficient
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matieres.map((matiere) => (
                    <tr key={matiere.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {matiere.nom}
                      </td>
                      {/* <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {matiere.description}
                      </td> */}
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {matiere.coefficient}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditMatiere(matiere)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMatiere(matiere.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulletins Section */}
          {activeSection === "bulletins" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  Gestion du Bulletin
                </h3>
                <p className="text-blue-700 text-sm">
                  Sélectionnez un élève et un cycle pour afficher le bulletin de notes.
                </p>
              </div>

              {/* Selection Dropdowns */}
              <div className="flex flex-wrap gap-4 items-center bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User size={18} className="text-blue-600" />
                  <select
                    value={selectedStudent ?? ""}
                    onChange={(e) => setSelectedStudent(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-1 text-sm min-w-[200px]"
                  >
                    {eleves.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.prenom} {st.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* <div className="flex items-center space-x-2">
                  <Calendar size={18} className="text-blue-600" />
                  <select
                    value={selectedTrimester}
                    onChange={(e) => setSelectedTrimester(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm min-w-[200px]"
                  >
                    {classe?.trimester?.map((trim: any) => (
                      <option key={trim.id} value={trim.id}>
                        {trim.nom}
                      </option>
                    ))}
                  </select>
                </div> */}
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
                  </button> */}
                  {/* <button
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
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${highlightedTrimester === 0
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                      }`}
                  >
                    1er Trimestre
                  </button>
                  <button
                    onClick={() => setHighlightedTrimester(highlightedTrimester === 1 ? null : 1)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${highlightedTrimester === 1
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                      }`}
                  >
                    2ème Trimestre
                  </button>
                  <button
                    onClick={() => setHighlightedTrimester(highlightedTrimester === 2 ? null : 2)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${highlightedTrimester === 2
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

                {/* Display Bulletin */}
                <div ref={bulletinRef} className="flex-1">
                  {((typeof currentBulletin?.classe === 'object' && currentBulletin?.classe?.niveau) || classe?.niveau) === "lycee" ||
                    ((typeof currentBulletin?.classe === 'object' && currentBulletin?.classe?.niveau) || classe?.niveau) === "college" ? (
                    currentBulletin ? (
                      <BulletinPage
                        etudiant={currentStudent}
                        classeT={classId}
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
                        etudiant={currentBulletin.eleve}
                        classeT={classId}
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

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {activeSection === "eleves"
                ? "Nouvel Élève"
                : isEditMode
                  ? "Modifier la Matière"
                  : "Ajouter une Matière"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);

                // Set coefficient value from our state if it exists
                if (coefficientValue) {
                  formData.set("coefficient", coefficientValue);
                }

                handleAddItem(
                  formData,
                  activeSection === "eleves" ? "eleve" : "matiere"
                );
              }}
            >
              <div className={activeSection === "eleves" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {activeSection === "eleves" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de naissance
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        max={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lieu de naissance
                      </label>
                      <input
                        type="text"
                        name="birthplace"
                        required
                        placeholder="Ville, Pays"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sexe
                      </label>
                      <select
                        name="sexe"
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Classe
                      </label>
                      <input
                        type="text"
                        value={classe?.nom || ""}
                        disabled
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro parent (optionnel)
                      </label>
                      <input
                        type="email"
                        name="parentEmail"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom de la matière
                      </label>
                      <input
                        type="text"
                        name="nom"
                        required
                        defaultValue={editingMatiere?.nom || ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Professeur
                      </label>
                      <select
                        name="professeur_id"
                        required
                        defaultValue={editingMatiere?.professeur_id || ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner un professeur</option>
                        {profs.map((prof: Prof) => (
                          <option key={prof.id} value={prof.id}>
                            {prof.nom} {prof.prenom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Coefficient
                      </label>
                      <input
                        ref={coefficientInputRef}
                        type="text"
                        inputMode="decimal"
                        name="coefficient"
                        required
                        value={coefficientValue}
                        onChange={(e) => setCoefficientValue(e.target.value)}
                        onFocus={() => setShowKeyboard(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.currentTarget.closest('form') as HTMLFormElement;
                            if (form) form.requestSubmit();
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: 2, 2.5, 3.75"
                      />

                      {/* Mini Keyboard */}
                      {showKeyboard && (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setCoefficientValue(coefficientValue + num)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setCoefficientValue(coefficientValue + "0")}
                              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
                            >
                              0
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoefficientValue(coefficientValue + ".")}
                              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
                            >
                              .
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newValue = coefficientValue.slice(0, -1);
                                setCoefficientValue(newValue);
                              }}
                              className="px-4 py-2 bg-red-50 border border-red-300 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                            >
                              ⌫
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setCoefficientValue(".5")}
                              className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 font-medium text-blue-700 text-sm"
                            >
                              0.5
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoefficientValue(".75")}
                              className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 font-medium text-blue-700 text-sm"
                            >
                              0.75
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoefficientValue(".25")}
                              className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 font-medium text-blue-700 text-sm"
                            >
                              0.25
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowKeyboard(false)}
                            className="mt-2 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                          >
                            Fermer
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setIsEditMode(false);
                    setEditingMatiere(null);
                    setCoefficientValue("");
                    setShowKeyboard(false);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {activeSection === "eleves"
                    ? "Ajouter l'élève"
                    : isEditMode
                      ? "Enregistrer les modifications"
                      : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
