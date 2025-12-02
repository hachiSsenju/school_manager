import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  CreditCard as Edit,
  DollarSign,
  ArrowRight,
  User,
  Pencil,
  Eye,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Classe, Ecole, Student } from "../types";
import { EleveService } from "../services/eleveService"; // 👈 Correct service
import { EcoleService } from "../services/ecoleServices";
import { SessionServices } from "../services/sessionServices";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

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

export function StudentsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [error, setError] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterFinancialStatus, setFilterFinancialStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "class" | "status" | "birthday">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [schools, setSchools] = useState<Ecole[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<Classe[]>([]);

  // Centralized fetch function to avoid duplication
  const fetchSchoolData = async () => {
    try {
      const response = await EcoleService.getById(SessionServices.getSchoolId());
      if (response) {
        setSchools(response);
        setSchoolStudents(response.eleves || []);
        setSchoolClasses(response.classes || []);
      } else {
        setError("Aucune école trouvée.");
      }
    } catch (err) {
      console.error("Erreur lors du chargement des écoles :", err);
      setError("Impossible de charger les écoles.");
    }
  };

  // ✅ Fetch all schools (and their classes/students) on mount
  useEffect(() => {
    fetchSchoolData();
  }, []);

  // Filter and sort students
  const filteredAndSortedStudents = schoolStudents
    .filter((student) => {
      // Filter by search query (name)
      if (searchQuery && !`${student.nom} ${student.prenom}`.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Filter by class - convert both to string for comparison
      if (filterClass !== "all" && student.classe && String(student.classe.id) !== String(filterClass)) {
        return false;
      }
      // Filter by financial status
      // if (filterFinancialStatus !== "all") {
      //   const status = getFinancialStatus(student.solde_initial);
      //   if (filterFinancialStatus === "avance" && status.text !== "Avance") return false;
      //   if (filterFinancialStatus === "a_jour" && status.text !== "À jour") return false;
      //   if (filterFinancialStatus === "impaye" && status.text !== "Impayé") return false;
      // }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
          break;
        case "class":
          comparison = a.classe.nom.localeCompare(b.classe.nom);
          break;
        // case "status":
        //   const statusA = getFinancialStatus(a.solde_initial);
        //   const statusB = getFinancialStatus(b.solde_initial);
        //   comparison = statusA.text.localeCompare(statusB.text);
        //   break;
        case "birthday":
          comparison = new Date(a.birthday).getTime() - new Date(b.birthday).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount);

  const getFinancialStatus = (balance: number) => {
    if (balance > 0)
      return { text: "Avance", color: "text-green-600 bg-green-100" };
    if (balance < 0)
      return { text: "Impayé", color: "text-red-600 bg-red-100" };
    return { text: "À jour", color: "text-blue-600 bg-blue-100" };
  };

  const handleTransferStudents = async (targetClassId: string) => {
    try {
      const targetClass = schoolClasses.find(c => c.id === targetClassId);
      const targetClassName = targetClass ? targetClass.nom : "la classe sélectionnée";
      const studentsCount = selectedStudents.length;

      await Promise.all(
        selectedStudents.map(async (studentId) => {
          await EleveService.transfert(studentId, targetClassId);
        })
      );

      // Clear selected students
      setSelectedStudents([]);
      
      // Refresh data
      await fetchSchoolData();
      
      // Close modal
      setShowTransferModal(false);
      
      // Clear any previous errors
      setError("");
      
      // Show success alert with SweetAlert
      Swal.fire({
        icon: "success",
        title: "Transfert réussi",
        text: `${studentsCount} élève(s) transféré(s) avec succès vers ${targetClassName}.`,
        confirmButtonColor: "#16a34a",
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (err) {
      console.error("Erreur lors du transfert des élèves:", err);
      setError("Transfert échoué.");
      setShowTransferModal(false);
      Swal.fire({
        icon: "error",
        title: "Erreur de transfert",
        text: "Une erreur s'est produite lors du transfert des élèves. Veuillez réessayer.",
        confirmButtonColor: "#dc2626",
      });
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
    
    // Check if matricule already exists
    const existingMatricules = schoolStudents.map(s => s.matricule).filter(Boolean);
    
    if (existingMatricules.includes(baseMatricule)) {
      // Add additional random digits if exists
      const extraRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${baseMatricule}${extraRandom}`;
    }
    
    return baseMatricule;
  };

  const handleAddStudent = async (formData: FormData) => {
    try {
      const ecoleId = SessionServices.getSchoolId();
      if (!ecoleId) throw new Error("Aucune école disponible");

      const nom = formData.get("lastName") as string;
      const prenom = formData.get("firstName") as string;
      const birthday = formData.get("dateOfBirth") as string;

      // Check if we're in edit mode
      if (isEditMode && editingStudent) {
        // Update existing student
        await EleveService.updateEleve(Number(editingStudent.id), {
          nom: nom,
          prenom: prenom,
          birthday: birthday,
          birthplace: formData.get("birthplace") as string,
          sexe: formData.get("sexe") as string,
          classe_id: formData.get("classId"),
          email_parent: formData.get("parentEmail") || undefined,
        });
      } else {
        // Add new student
        await EleveService.addEleve({
          nom: nom,
          prenom: prenom,
          birthday: birthday,
          birthplace: formData.get("birthplace") as string,
          sexe: formData.get("sexe") as string,
          matricule: generateMatricule(nom, prenom, birthday),
          classe_id: formData.get("classId"),
          email_parent: formData.get("parentEmail") || undefined,
          ecole_id: ecoleId,
        });
      }

      fetchSchoolData();
      setShowAddForm(false);
      setIsEditMode(false);
      setEditingStudent(null);
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'élève:", err);
      setError(isEditMode ? "Modification de l'élève échoué." : "Ajout de l'élève échoué.");
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsEditMode(true);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setIsEditMode(false);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Élèves</h1>
        <div className="flex space-x-4">
          {selectedStudents.length > 0 && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowRight size={16} className="mr-2" />
              Transférer ({selectedStudents.length})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Nouvel Élève
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        
        {/* Search Bar */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Rechercher un élève par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filter by Class */}
          <div className="flex items-center gap-2 flex-1">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes les classes</option>
              {schoolClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.nom} ({getNiveauDisplayName(classItem.niveau)})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Financial Status */}
          {/* <div className="flex items-center gap-2 flex-1">
            <DollarSign size={20} className="text-gray-500" />
            <select
              value={filterFinancialStatus}
              onChange={(e) => setFilterFinancialStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="avance">Avance</option>
              <option value="a_jour">À jour</option>
              <option value="impaye">Impayé</option>
            </select>
          </div> */}

          {/* Sort options */}
          <div className="flex items-center gap-2 flex-1">
            <ArrowUpDown size={20} className="text-gray-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as "name" | "class" | "status" | "birthday");
                setSortOrder(order as "asc" | "desc");
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name-asc">Nom (A-Z)</option>
              <option value="name-desc">Nom (Z-A)</option>
              <option value="class-asc">Classe (A-Z)</option>
              <option value="class-desc">Classe (Z-A)</option>
              <option value="status-asc">Statut (A-Z)</option>
              <option value="status-desc">Statut (Z-A)</option>
              <option value="birthday-asc">Date de naissance (Ancien → Récent)</option>
              <option value="birthday-desc">Date de naissance (Récent → Ancien)</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          {filteredAndSortedStudents.length} élève(s) trouvé(s)
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(filteredAndSortedStudents.map((s) => s.id));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Élève
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Situation Financière
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedStudents.length > 0 ? (
                filteredAndSortedStudents.map((student) => {
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([
                              ...selectedStudents,
                              student.id,
                            ]);
                          } else {
                            setSelectedStudents(
                              selectedStudents.filter((id) => id !== student.id)
                            );
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.nom} {student.prenom}
                          </div>
                          <div className="text-sm text-gray-500">
                            Né(e) le{" "}
                            {new Date(student.birthday).toLocaleDateString(
                              "fr-FR"
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {student.classe.nom}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* <div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}
                        >
                          {status.text}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatCurrency(student.solde_initial)}
                        </div>
                      </div> */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        >
                          <Pencil size={16} />
                        </button>
                        <Link to={`/students/${student.id}`}>
                        <button className="text-green-600 hover:text-green-900 p-1 rounded">
                          <Eye size={16} />
                        </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <User size={48} className="mx-auto text-gray-400 mb-3" />
                    <p>Aucun élève trouvé avec les filtres sélectionnés</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {isEditMode ? "Modifier l'Élève" : "Nouvel Élève"}
            </h3>
            <form
              id="studentForm"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddStudent(new FormData(e.target as HTMLFormElement));
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={editingStudent?.prenom || ""}
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
                    defaultValue={editingStudent?.nom || ""}
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
                    defaultValue={editingStudent?.birthday ? new Date(editingStudent.birthday).toISOString().split('T')[0] : ""}
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
                    defaultValue={editingStudent?.birthplace || ""}
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
                    defaultValue={editingStudent?.sexe || ""}
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
                  <select
                    name="classId"
                    defaultValue={editingStudent?.classe.id || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une classe</option>
                    {schoolClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.nom} ({getNiveauDisplayName(classItem.niveau)})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro parent (optionnel)
                  </label>
                  <input
                    type="telephone"
                    name="parentEmail"
                    defaultValue={editingStudent?.email_parent || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {isEditMode ? "Enregistrer les modifications" : "Ajouter l'élève"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              Transférer les élèves sélectionnés
            </h3>
            <div className="space-y-3">
              {schoolClasses.map((classItem: Classe) => (
                <button
                  key={classItem.id}
                  onClick={() => handleTransferStudents(classItem.id)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{classItem.nom}</div>
                  <div className="text-sm text-gray-500">
                    Niveau {getNiveauDisplayName(classItem.niveau)}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
