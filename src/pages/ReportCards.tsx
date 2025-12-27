import { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import {
  Bulletin,
  Classe,
  Ecole,
  Grade,
  Matiere,
  Student,
  Trimester,
} from "../types";
import { GradeService } from "../services/gradeService";
import { BulletinService } from "../services/bulletinService";
import { EcoleService } from "../services/ecoleServices";
import { ArrowLeft, BookOpen, Download, Eye, Plus, Printer, Users } from "lucide-react";
import { TrimesterServices } from "../services/trimesterService";
import { SessionServices } from "../services/sessionServices";
import Swal from 'sweetalert2';

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

export default function GradesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Selection states
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedTrimester, setSelectedTrimester] = useState<string>("");

  // 🔹 Modal states
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showEditGradeForm, setShowEditGradeForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

  // 🔹 Misc states
  const [matiereOrder, setMatiereOrder] = useState<string[]>([]);
  const [school, setSchool] = useState<Ecole>();
  const [currentTrimesterLibelle, setCurrentTrimesterLibelle] =
    useState<string>("");
  const [prefilledFormData, setPrefilledFormData] = useState({
    id: null as string | null,
    matiere: null as Matiere | null,
    note_maximal: 0,
    type_examen: "" as "composition" | "devoir" | "interrogation" | "",
    note: "",
  });

  useEffect(() => {
    const getSchool = async () => {
      const response = await EcoleService.getById(SessionServices.getSchoolId());
      if (response) {
        setSchool(response);
      }
    };
    getSchool();
  }, []);

  const [isPrefilledReadOnly, setIsPrefilledReadOnly] = useState(false);

  // 🔹 Bulletin data
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const [bltId, setBltId] = useState<string>("");

  const bulletinRef = useRef<HTMLDivElement>(null);

  // 🔹 Extract data from the school prop
  const schoolClasses = school?.classes || [];
  const schoolStudents = school?.eleves || [];
  const schoolTrimesters = school?.trimesters || [];

  const selectedClassData = schoolClasses.find(
    (c: Classe) => c.id === selectedClass
  );
  const studentsInClass = selectedClassData?.eleves ?? [];
  const selectedStudentData = schoolStudents.find(
    (s: Student) => s.id === selectedStudent
  );
  const classMatieres = selectedClassData?.matieres ?? [];
  const classTrimesters = selectedClassData?.trimester ?? [];
  const selectedTrimesterData = schoolTrimesters.find(
    (t: Trimester) => t.id === selectedTrimester
  );

  async function Refresh() {
    try {
      const bulletin =
        await BulletinService.getBulletinsByStudentAndSemeterId(
          selectedStudent,
          selectedTrimester
        );
      setCurrentBulletin(bulletin);
      setBltId(bulletin.id);
    } catch (err) {
      console.error("Erreur lors du chargement du bulletin:", err);
      setCurrentBulletin(null);
    }
  }
  useEffect(() => {
    const fetchBulletin = async () => {
      if (selectedStudent && selectedTrimester) {
        try {
          const bulletin =
            await BulletinService.getBulletinsByStudentAndSemeterId(
              selectedStudent,
              selectedTrimester
            );
          setCurrentBulletin(bulletin);
          setBltId(bulletin.id);
        } catch (err) {
          console.error("Erreur lors du chargement du bulletin:", err);
          setCurrentBulletin(null);
        }
      } else {
        setCurrentBulletin(null);
      }
    };

    fetchBulletin();
  }, [selectedStudent, selectedTrimester]);

  // 🔹 Auto-select first trimester when class changes
  useEffect(() => {
    if (selectedClass && classTrimesters.length > 0 && !selectedTrimester) {
      setSelectedTrimester(classTrimesters[0].id);
    }
  }, [selectedClass, classTrimesters, selectedTrimester]);

  // 🔹 Add new grade
  const handleAddGrade = async (formData: FormData) => {
    try {
      setIsLoading(true);
      setError("");

      const subjectFromForm = formData.get("subjectId") as string | null;
      const examTypeFromForm = formData.get("examType") as
        | "composition"
        | "devoir"
        | "interrogation"
        | null;

      const matiereId = subjectFromForm || prefilledFormData.matiere?.id || "";
      const typeExamen =
        examTypeFromForm ||
        (prefilledFormData.type_examen as
          | "composition"
          | "devoir"
          | "interrogation"
          | "") ||
        "";

      const gradeData = {
        id: prefilledFormData.id || undefined,
        eleve_id: selectedStudent,
        matiere_id: matiereId,
        note: Number(formData.get("value")),
        note_maximal: Number(formData.get("maxValue")) || 20,
        type_examen: typeExamen,
        trimester_id: selectedTrimester,
        date: formData.get("date") as string,
        bulletin_id: bltId,
      };

      if (
        !gradeData.eleve_id ||
        !gradeData.matiere_id ||
        gradeData.note === undefined ||
        gradeData.note_maximal === undefined
      ) {
        throw new Error("Tous les champs sont requis.");
      }

      await GradeService.addGrade(gradeData);
      setShowGradeForm(false);
      setIsPrefilledReadOnly(false);
      setPrefilledFormData({
        id: null,
        matiere: null,
        note_maximal: 0,
        type_examen: "",
        note: "",
      });
      Refresh();

      Swal.fire({
        icon: 'success',
        title: 'Note ajoutée !',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (err) {
      console.error("Erreur lors de l'ajout de la note:", err);
      // setError("Erreur lors de l'ajout de la note. Vérifiez les données.");
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: "Ajout de la note échoué.",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Edit grade
  const handleEditGrade = async (formData: FormData) => {
    if (!editingGrade) return;

    try {
      setIsLoading(true);
      setError("");

      const gradeData = {
        id: editingGrade.id,
        eleve_id: editingGrade.student_id,
        matiere_id: formData.get("subjectId") as string,
        note: Number(formData.get("value")),
        note_maximal: Number(formData.get("maxValue")),
        type_examen: formData.get("examType") as
          | "composition"
          | "devoir"
          | "interrogation",
        trimester_id: selectedTrimester,
        bulletin_id: currentBulletin?.id || null,
        date: formData.get("date") as string,
      };

      await GradeService.updateGrade(editingGrade.id, gradeData);
      setShowEditGradeForm(false);
      Refresh()
      setEditingGrade(null);

      Swal.fire({
        icon: 'success',
        title: 'Note modifiée !',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (err) {
      console.error("Erreur lors de la modification de la note:", err);
      // setError("Erreur lors de la modification de la note.");
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: "Modification de la note échouée.",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Utilities
  const getStudentGrades = () => currentBulletin?.grades || [];

  const calculateSubjectAverage = (matiereId: string) => {
    const grades = (currentBulletin?.grades || []).filter(
      (g) => g.matiere_id === matiereId
    );
    if (grades.length === 0) return null;
    const total = grades.reduce(
      (sum, g) => sum + (g.note / g.note_maximal) * 20,
      0
    );
    return total / grades.length;
  };

  const calculateGeneralAverage = () => {
    if (!selectedClassData) return null;
    let totalPoints = 0;
    let totalCoefficients = 0;
    classMatieres.forEach((matiere) => {
      const avg = calculateSubjectAverage(matiere.id);
      if (avg !== null) {
        totalPoints += avg * matiere.coefficient;
        totalCoefficients += matiere.coefficient;
      }
    });
    return totalCoefficients > 0 ? totalPoints / totalCoefficients : null;
  };

  const formatGrade = (grade: number) => grade.toFixed(2);

  const getGradeColor = (grade: number) => {
    if (grade >= 16) return "text-green-600";
    if (grade >= 14) return "text-blue-600";
    if (grade >= 10) return "text-orange-600";
    return "text-red-600";
  };

  const getOrderedMatieres = () => {
    if (matiereOrder.length === 0) return classMatieres;
    return matiereOrder
      .map((id) => classMatieres.find((m) => m.id === id))
      .filter(Boolean) as Matiere[];
  };

  // 🔹 Export PDF
  const exportToPDF = async () => {
    if (!bulletinRef.current) return;

    const opt = {
      margin: 0.5,
      filename: `bulletin_${selectedStudentData?.nom}_${selectedStudentData?.prenom
        }_${selectedTrimesterData?.nom || "trimestre"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: "in" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
    };

    try {
      await html2pdf().set(opt).from(bulletinRef.current).save();
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
      setError("Erreur lors de la génération du PDF.");
    }
  };

  // 🔹 Create Bulletin
  const handleCreateBulletin = async (
    student_id: string,
    classe_id: string,
    trimester_id: string
  ) => {
    try {
      await BulletinService.createBulletin(student_id, classe_id, trimester_id);
      Refresh()
    } catch (err) {
      console.error("Erreur lors de la création du bulletin:", err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => (window.location.href = "/")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Retour</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              Gestion des Bulletins
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Interface de gestion des notes et bulletins</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Classes */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Classes</h2>
            <p className="text-sm text-gray-500">Sélectionnez une classe</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Chargement...</p>
              </div>
            ) : schoolClasses.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {schoolClasses.map((classe) => (
                  <div
                    key={classe.id}
                    onClick={() => {
                      setSelectedClass(classe.id);
                      setSelectedStudent(""); // Reset student selection
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedClass === classe.id
                      ? "bg-blue-50 border-r-2 border-blue-500"
                      : ""
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {classe.nom}
                        </h3>
                        <p className="text-sm text-gray-500">{getNiveauDisplayName(classe.niveau)}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm text-gray-500">
                          <Users size={14} className="mr-1" />
                          {classe.eleves?.length ?? 0}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <BookOpen size={14} className="mr-1" />
                          {classe.matieres?.length ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune classe disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Sidebar - Students */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Élèves</h2>
            <p className="text-sm text-gray-500">
              {selectedClassData
                ? `${selectedClassData.nom}`
                : "Sélectionnez une classe"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedClass ? (
              studentsInClass.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {studentsInClass.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedStudent === student.id
                        ? "bg-blue-50 border-r-2 border-blue-500"
                        : ""
                        }`}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <Users size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {student.nom} {student.prenom}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Né(e) le{" "}
                            {new Date(student.birthday).toLocaleDateString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <Users size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucun élève dans cette classe</p>
                </div>
              )
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sélectionnez une classe</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Bulletin */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {selectedStudentData
                    ? `${selectedStudentData.nom} ${selectedStudentData.prenom}`
                    : "Bulletin"}
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedClassData
                    ? `${selectedClassData.nom} - ${selectedClassData.niveau}`
                    : "Sélectionnez un élève"}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Trimester Selector */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    Trimestre:
                  </label>
                  <select
                    value={selectedTrimester}
                    onChange={async (e) => {
                      setSelectedTrimester(e.target.value);
                      // getCurentTrim ester();
                      const response = await TrimesterServices.getById(
                        e.target.value
                      );
                      setCurrentTrimesterLibelle(response.libelle);
                    }}
                    disabled={
                      !selectedStudent ||
                      isLoading ||
                      classTrimesters.length === 0
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Sélectionner un trimestre</option>
                    {classTrimesters.map((trimester: Trimester) => (
                      <option key={trimester.id} value={trimester.id}>
                        {trimester.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                {selectedStudent && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowGradeForm(true)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      <Plus size={14} className="mr-1" />
                      Ajouter Note
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      <Download size={14} className="mr-1" />
                      PDF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      <Printer size={14} className="mr-1" />
                      Imprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-b border-red-200 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Bulletin Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedStudent ? (
              currentBulletin ? (
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedStudent ? (
                    <div className="space-y-6">
                      {/* Bulletin PDF Content */}
                      <div
                        ref={bulletinRef}
                        className="bg-white shadow-lg border print:shadow-none print:border-0 bulletin-container"
                      >
                        {/* Bulletin Header */}
                        <div className="border-b-2 border-gray-300 p-6 print:border-gray-800 bulletin-header">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-center mb-4">
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                  BULLETIN DE NOTES
                                </h1>
                                <h2 className="text-lg font-semibold text-gray-700">
                                  École Primaire Excellence
                                </h2>
                                <p className="text-sm text-gray-600">
                                  Année Scolaire 2023-2024
                                </p>
                              </div>
                            </div>
                            <div className="w-24 h-24 border-2 border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center print:border-gray-800">
                              <div>
                                <div>LOGO</div>
                                <div>ÉCOLE</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Student Information */}
                        <div className="p-6 border-b border-gray-200">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3 text-lg">
                                INFORMATIONS ÉLÈVE
                              </h3>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="font-semibold">
                                    Nom et Prénom:
                                  </span>{" "}
                                  {selectedStudentData?.nom}{" "}
                                  {selectedStudentData?.prenom}
                                </p>
                                <p>
                                  <span className="font-semibold">Classe:</span>{" "}
                                  {selectedClassData?.nom}
                                </p>
                                <p>
                                  <span className="font-semibold">Niveau:</span>{" "}
                                  {selectedClassData?.niveau}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Date de naissance:
                                  </span>{" "}
                                  {selectedStudentData?.birthday
                                    ? new Date(
                                      selectedStudentData.birthday
                                    ).toLocaleDateString("fr-FR")
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3 text-lg">
                                {currentTrimesterLibelle}
                              </h3>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="font-semibold">
                                    Moyenne générale:
                                  </span>
                                  <span
                                    className={`ml-2 font-bold text-xl ${getGradeColor(
                                      calculateGeneralAverage() || 0
                                    )}`}
                                  >
                                    {calculateGeneralAverage()
                                      ? formatGrade(calculateGeneralAverage()!)
                                      : "-"}
                                    /20
                                  </span>
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Nombre de notes:
                                  </span>{" "}
                                  {getStudentGrades().length}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Date d'édition:
                                  </span>{" "}
                                  {new Date().toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Grades Table */}
                        <div className="p-6">
                          <h3 className="font-bold text-gray-900 mb-4 text-lg">
                            TABLEAU DES NOTES
                          </h3>

                          {classMatieres.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-400 print:border-gray-800 bulletin-table">
                                <thead>
                                  <tr className="bg-gray-100 print:bg-gray-200">
                                    <th className="border border-gray-400 px-4 py-3 text-left font-bold text-gray-900 print:border-gray-800">
                                      MATIÈRES
                                    </th>
                                    <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 print:border-gray-800">
                                      COEFF.
                                    </th>
                                    <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 print:border-gray-800">
                                      INTERROGATIONS
                                    </th>
                                    <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 print:border-gray-800">
                                      DEVOIRS
                                    </th>
                                    <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 print:border-gray-800">
                                      COMPOSITIONS
                                    </th>
                                    <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 print:border-gray-800">
                                      MOYENNE
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getOrderedMatieres().map(
                                    (matiere: Matiere) => {
                                      const interrogations =
                                        currentBulletin?.grades?.filter(
                                          (g) =>
                                            g.matiere.id === matiere.id &&
                                            g.type_examen === "interrogation"
                                        ) || [];
                                      const devoirs =
                                        currentBulletin?.grades?.filter(
                                          (g) =>
                                            g.matiere.id === matiere.id &&
                                            g.type_examen === "devoir"
                                        ) || [];
                                      const compositions =
                                        currentBulletin?.grades?.filter(
                                          (g) =>
                                            g.matiere.id === matiere.id &&
                                            g.type_examen === "composition"
                                        ) || [];

                                      // Helper function to handle click on a grade column
                                      const handleColumnClick = (
                                        type:
                                          | "composition"
                                          | "devoir"
                                          | "interrogation"
                                      ) => {
                                        // Find the first grade of this type for this matiere (if any)
                                        const existingGrade =
                                          currentBulletin?.grades?.find(
                                            (g) =>
                                              g.matiere.id === matiere.id &&
                                              g.type_examen === type
                                          );
                                        setPrefilledFormData({
                                          matiere: matiere,
                                          note_maximal:
                                            10 * (matiere.coefficient ?? 1),
                                          type_examen: type,
                                          note: existingGrade
                                            ? String(existingGrade.note)
                                            : "",
                                          id: existingGrade
                                            ? existingGrade.id
                                            : null,
                                        });
                                        setIsPrefilledReadOnly(true);
                                        setShowGradeForm(true);
                                      };

                                      return (
                                        <tr
                                          key={matiere.id}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="border border-gray-400 px-4 py-3 font-semibold text-gray-900 print:border-gray-800">
                                            {matiere.nom}
                                          </td>
                                          <td className="border border-gray-400 px-4 py-3 text-center text-gray-900 print:border-gray-800">
                                            {matiere.coefficient ?? "-"}
                                          </td>

                                          {/* --- INTERROGATIONS --- */}
                                          <td
                                            onClick={() =>
                                              handleColumnClick("interrogation")
                                            }
                                            className="border border-gray-400 px-4 py-3 text-center print:border-gray-800 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                                            title="Ajouter une note d'interrogation"
                                          >
                                            <div className="flex flex-wrap justify-center gap-1">
                                              {interrogations.length > 0 ? (
                                                interrogations.map((grade) => (
                                                  <span
                                                    key={grade.id}
                                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-900"
                                                  >
                                                    {grade.note}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="text-gray-400 text-sm">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* --- DEVOIRS --- */}
                                          <td
                                            onClick={() =>
                                              handleColumnClick("devoir")
                                            }
                                            className="border border-gray-400 px-4 py-3 text-center print:border-gray-800 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                                            title="Ajouter une note de devoir"
                                          >
                                            <div className="flex flex-wrap justify-center gap-1">
                                              {devoirs.length > 0 ? (
                                                devoirs.map((grade) => (
                                                  <span
                                                    key={grade.id}
                                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-900"
                                                  >
                                                    {grade.note}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="text-gray-400 text-sm">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* --- COMPOSITIONS --- */}
                                          <td
                                            onClick={() =>
                                              handleColumnClick("composition")
                                            }
                                            className="border border-gray-400 px-4 py-3 text-center print:border-gray-800 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                                            title="Ajouter une note de composition"
                                          >
                                            <div className="flex flex-wrap justify-center gap-1">
                                              {compositions.length > 0 ? (
                                                compositions.map((grade) => (
                                                  <span
                                                    key={grade.id}
                                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-900"
                                                  >
                                                    {grade.note}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="text-gray-400 text-sm">
                                                  -
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* --- MOYENNE --- */}
                                          <td className="border border-gray-400 px-4 py-3 text-center print:border-gray-800">
                                            <span className="text-gray-600 italic text-sm">
                                              —
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <BookOpen
                                size={48}
                                className="mx-auto mb-4 text-gray-300"
                              />
                              <p className="font-medium">
                                Aucune matière assignée à cette classe
                              </p>
                              <p className="text-sm mt-1">
                                Les matières apparaîtront ici une fois assignées
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Footer with signature and stamp areas */}
                        <div className="border-t-2 border-gray-300 p-6 print:border-gray-800 bulletin-footer">
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="h-16 border border-gray-300 flex items-center justify-center text-gray-400 text-xs print:border-gray-800 signature-box">
                                <div>
                                  <div>SIGNATURE</div>
                                  <div>PROFESSEUR</div>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="h-16 border border-gray-300 flex items-center justify-center text-gray-400 text-xs print:border-gray-800 signature-box">
                                <div>
                                  <div>CACHET</div>
                                  <div>ÉCOLE</div>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="h-16 border border-gray-300 flex items-center justify-center text-gray-400 text-xs print:border-gray-800 signature-box">
                                <div>
                                  <div>SIGNATURE</div>
                                  <div>DIRECTEUR</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Management Actions (Hidden in print) */}
                      <div className="bg-white rounded-lg shadow-sm border p-4 print:hidden no-print">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">
                            Gestion des Notes
                          </h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowGradeForm(true)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                            >
                              <Plus size={14} className="mr-1" />
                              Ajouter Note
                            </button>
                            {matiereOrder.length > 0 && (
                              <button
                                onClick={() => setMatiereOrder([])}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Réinitialiser l'ordre
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Glissez-déposez les lignes du tableau pour réorganiser
                          l'ordre des matières
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <Eye size={64} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">
                          Sélectionnez un élève
                        </h3>
                        <p className="text-sm">
                          Choisissez une classe puis un élève pour voir son
                          bulletin
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucun bulletin trouvé
                  </h3>
                  <p className="text-sm mb-4">
                    Aucun bulletin n'a été trouvé pour cet élève et ce
                    trimestre.
                  </p>
                  <button
                    onClick={() => {
                      handleCreateBulletin(
                        selectedStudent,
                        selectedClass,
                        selectedTrimester
                      );
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Créer un bulletin
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Eye size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    Sélectionnez un élève
                  </h3>
                  <p className="text-sm">
                    Choisissez une classe puis un élève pour voir son bulletin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Grade Modal */}
        {showGradeForm && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Ajouter une Note</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddGrade(new FormData(e.target as HTMLFormElement));
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matière
                    </label>
                    <select
                      name="subjectId"
                      required
                      disabled={
                        isLoading ||
                        classMatieres.length === 0 ||
                        isPrefilledReadOnly
                      }
                      value={prefilledFormData.matiere?.id}
                      onChange={(e) => {
                        if (isPrefilledReadOnly) return;
                        const selectedMatiere = classMatieres.find(
                          (m) => m.id === e.target.value
                        );
                        setPrefilledFormData((prev) => ({
                          ...prev,
                          matiere: selectedMatiere || null,
                          note_maximal: selectedMatiere
                            ? 10 * (selectedMatiere.coefficient ?? 1)
                            : 0,
                        }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Sélectionner une matière</option>
                      {classMatieres.map((matiere) => (
                        <option key={matiere.id} value={matiere.id}>
                          {matiere.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note obtenue
                      </label>
                      <input
                        autoFocus
                        type="number"
                        name="value"
                        required
                        min="0"
                        step="0.25"
                        value={prefilledFormData.note}
                        onChange={(e) => {
                          setPrefilledFormData((prev) => ({
                            ...prev,
                            note: e.target.value,
                          }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      //  readOnly={isPrefilledReadOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note sur
                      </label>
                      <input
                        type="number"
                        name="maxValue"
                        required
                        min="1"
                        value={prefilledFormData.note_maximal || 20}
                        onChange={(e) => {
                          if (isPrefilledReadOnly) return;
                          setPrefilledFormData((prev) => ({
                            ...prev,
                            note_maximal: Number(e.target.value),
                          }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly={isPrefilledReadOnly}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'évaluation
                    </label>
                    <select
                      name="examType"
                      required
                      value={prefilledFormData.type_examen}
                      onChange={(e) => {
                        if (isPrefilledReadOnly) return;
                        setPrefilledFormData((prev) => ({
                          ...prev,
                          type_examen: e.target.value as
                            | "composition"
                            | "devoir"
                            | "interrogation",
                        }));
                      }}
                      disabled={isPrefilledReadOnly}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="interrogation">Interrogation</option>
                      <option value="devoir">Devoir</option>
                      <option value="composition">Composition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGradeForm(false);
                      setPrefilledFormData({
                        id: null,
                        matiere: null,
                        note_maximal: 0,
                        type_examen: "",
                        note: "",
                      });
                      setIsPrefilledReadOnly(false);
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {isLoading ? "Ajout..." : "Ajouter la note"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Grade Modal */}
        {showEditGradeForm && editingGrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Modifier la Note</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditGrade(new FormData(e.target as HTMLFormElement));
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matière
                    </label>
                    <select
                      name="subjectId"
                      required
                      defaultValue={editingGrade.matiere_id}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {classMatieres.map((matiere) => (
                        <option key={matiere.id} value={matiere.id}>
                          {matiere.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note obtenue
                      </label>
                      <input
                        type="number"
                        name="value"
                        required
                        min="0"
                        step="0.25"
                        defaultValue={editingGrade.note}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note sur
                      </label>
                      <input
                        type="number"
                        name="maxValue"
                        required
                        min="1"
                        defaultValue={editingGrade.note_maximal}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'évaluation
                    </label>
                    <select
                      name="examType"
                      required
                      defaultValue={editingGrade.type_examen}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="interrogation">Interrogation</option>
                      <option value="devoir">Devoir</option>
                      <option value="composition">Composition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trimestre
                    </label>
                    <select
                      name="trimestre"
                      required
                      defaultValue={editingGrade.trimestre}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1er Trimestre</option>
                      <option value={2}>2e Trimestre</option>
                      <option value={3}>3e Trimestre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={editingGrade.date}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditGradeForm(false);
                      setEditingGrade(null);
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isLoading ? "Modification..." : "Modifier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
