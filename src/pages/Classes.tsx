import { useState, useEffect } from "react";
import {
  Plus,
  Users,
  BookOpen,
  CreditCard as Edit,
  GraduationCap,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Matiere, Ecole } from "../types"
import { ClasseService } from "../services/classeService";
import { MatiereService } from "../services/matiereService";
import { EcoleService } from "../services/ecoleServices";
import { Classe, Prof } from "../types";
import { SessionServices } from "../services/sessionServices";

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

export function ClassManager() {
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | string>("");
  const [error, setError] = useState<string>("");
  const [school, setSchool] = useState<Ecole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClass, setEditingClass] = useState<Classe | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string>("");
  const [selectedResponsables, setSelectedResponsables] = useState<string[]>([]);
  const [filterNiveau, setFilterNiveau] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "niveau" | "students" | "frais">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const schoolId = SessionServices.getSchoolId();

  // Centralized fetch function
  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      const response = await EcoleService.getById(schoolId);
      if (response) {
        setSchool(response);
      } else {
        setError("École introuvable");
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'école :", err);
      setError("Impossible de charger l'école");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch the school and its classes + professors on mount
  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  const schoolClasses = school?.classes || [];
  const schoolTeachers = school?.professeurs || [];

  // Filter and sort classes
  const filteredAndSortedClasses = schoolClasses
    .filter((classItem: Classe) => {
      // Filter by niveau
      if (filterNiveau !== "all" && classItem.niveau !== filterNiveau) {
        return false;
      }
      // Filter by search query (name)
      if (searchQuery && !classItem.nom.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a: Classe, b: Classe) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.nom.localeCompare(b.nom);
          break;
        case "niveau":
          comparison = a.niveau.localeCompare(b.niveau);
          break;
        case "students":
          comparison = (a.eleves?.length || 0) - (b.eleves?.length || 0);
          break;
        case "frais":
          comparison = Number(a.frais) - Number(b.frais);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleAddClass = async (formData: FormData) => {
    try {
      const niveau = formData.get("level") as string;
      const responsablesFormData = selectedResponsables.length > 0 
        ? selectedResponsables 
        : (formData.getAll("responsables") as string[]);
      
      // Check if we're in edit mode
      if (isEditMode && editingClass) {
        // Update existing class
        await ClasseService.updateClasse(Number(editingClass.id), {
          nom: formData.get("name"),
          niveau: niveau,
          frais: Number(formData.get("baseFee")),
          responsables: responsablesFormData,
        });
      } else {
        // Add new class
        await ClasseService.addClasse({
          nom: formData.get("name"),
          niveau: niveau,
          frais: Number(formData.get("baseFee")),
          ecole_id: school?.id,
          responsables: responsablesFormData,
        });
      }

      // Refresh the school data after adding/updating
      fetchSchoolData();

      setShowAddClassForm(false);
      setIsEditMode(false);
      setEditingClass(null);
      setSelectedNiveau("");
      setSelectedResponsables([]);
    } catch (err) {
      console.error("Erreur lors de la création/modification de la classe:", err);
      setError(isEditMode ? "Modification de la classe échouée." : "Création de la classe échouée.");
    }
  };

  const handleEdit = (classItem: Classe) => {
    setEditingClass(classItem);
    setSelectedNiveau(classItem.niveau);
    // Initialize selected responsables with current responsables IDs
    setSelectedResponsables(
      classItem.responsables?.map((prof) => prof.id) || []
    );
    setIsEditMode(true);
    setShowAddClassForm(true);
  };

  const handleCloseForm = () => {
    setShowAddClassForm(false);
    setIsEditMode(false);
    setEditingClass(null);
    setSelectedNiveau("");
    setSelectedResponsables([]);
  };

  const handleAddSubject = async (formData: FormData) => {
    try {
      const payload = {
        nom: formData.get("name") as string,
        coefficient: Number(formData.get("coefficient")),
        classe_id: selectedClassId,
      };

      await MatiereService.addMatiere(payload);

      // Refresh the school data after adding subject
      fetchSchoolData();

      setShowAddSubjectForm(false);
      setSelectedClassId("");
    } catch (err) {
      console.error("Erreur lors de l'ajout de la matière:", err);
      setError("Ajout de la matière échoué.");
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Classes</h1>
        <button
          onClick={() => setShowAddClassForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Nouvelle Classe
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search by name */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom de classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter by niveau */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filterNiveau}
              onChange={(e) => setFilterNiveau(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les niveaux</option>
              <option value="maternelle">Maternelle</option>
              <option value="primaire">1er Cycle</option>
              <option value="college">2ème Cycle</option>
              <option value="lycee">Lycée</option>
            </select>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={20} className="text-gray-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as "name" | "niveau" | "students" | "frais");
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name-asc">Nom (A-Z)</option>
              <option value="name-desc">Nom (Z-A)</option>
              <option value="niveau-asc">Niveau (Croissant)</option>
              <option value="niveau-desc">Niveau (Décroissant)</option>
              <option value="students-asc">Élèves (Moins → Plus)</option>
              <option value="students-desc">Élèves (Plus → Moins)</option>
              <option value="frais-asc">Frais (Moins → Plus)</option>
              <option value="frais-desc">Frais (Plus → Moins)</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          {filteredAndSortedClasses.length} classe(s) trouvée(s)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAndSortedClasses.length > 0 ? (
          filteredAndSortedClasses.map((classItem : Classe) => {
          return (
            <div
              key={classItem.id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden"
            >
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <GraduationCap size={24} className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {classItem.nom}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Niveau: {getNiveauDisplayName(classItem.niveau)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(classItem)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {classItem.eleves?.length ?? 0}
                    </p>
                    <p className="text-sm text-gray-600">Élèves inscrits</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <BookOpen size={20} className="text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {classItem.matieres?.length ?? 0}
                    </p>
                    <p className="text-sm text-gray-600">Matières</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frais de base:</span>
                    <span className="font-medium">
                      {Number(classItem.frais).toLocaleString()} F CFA
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <button
                    onClick={() => {
                      window.location.href=`classes/${classItem.id}`
                    }}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Détails classe
                  </button>
                  
                  {/* Display Responsables for primaire and maternelle */}
                  {(classItem.niveau === "primaire" || classItem.niveau === "maternelle") && classItem.responsables && classItem.responsables.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Professeurs Responsables:</p>
                      <div className="flex flex-wrap gap-1">
                        {classItem.responsables.map((prof) => (
                          <span
                            key={prof.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {prof.nom} {prof.prenom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {classItem.matieres && classItem.matieres.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Matières enseignées:
                    </h4>
                    <div className="space-y-1">
                      {classItem.matieres.slice(0, 3).map((matiere: Matiere) => (
                        <div
                          key={matiere.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">{matiere.nom}</span>
                          <span className="text-gray-500">
                            Coef. {matiere.coefficient}
                          </span>
                        </div>
                      ))}
                      {classItem.matieres.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{classItem.matieres.length - 3} autres matières
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            <GraduationCap size={48} className="mx-auto text-gray-400 mb-3" />
            <p>Aucune classe trouvée avec les filtres sélectionnés</p>
          </div>
        )}
      </div>

      {/* Add/Edit Class Form Modal */}
      {showAddClassForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              {isEditMode ? "Modifier la Classe" : "Nouvelle Classe"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddClass(new FormData(e.target as HTMLFormElement));
              }}
              onChange={(e) => {
                const target = e.target as HTMLSelectElement;
                if (target.name === "level") {
                  setSelectedNiveau(target.value);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la classe
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingClass?.nom || ""}
                    placeholder="Ex: 6ème A, CM2 B..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    name="level"
                    required
                    defaultValue={editingClass?.niveau || ""}
                    onChange={(e) => setSelectedNiveau(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un niveau</option>
                    <option value="maternelle">Maternelle</option>
                    <option value="primaire">1er Cycle</option>
                    <option value="college">2ème Cycle</option>
                    <option value="lycee">Lycée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frais annuels (F CFA)
                  </label>
                  <input
                    type="number"
                    name="baseFee"
                    required
                    defaultValue={editingClass?.frais || ""}
                    placeholder="150000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {/* Responsables selection - only for primaire and maternelle */}
                {(selectedNiveau === "primaire" || selectedNiveau === "maternelle" || editingClass?.niveau === "primaire" || editingClass?.niveau === "maternelle") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professeurs responsables (optionnel)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50">
                      {schoolTeachers.length > 0 ? (
                        <div className="space-y-2">
                          {schoolTeachers.map((teacher : Prof) => {
                            const isChecked = selectedResponsables.includes(teacher.id);
                            return (
                              <label 
                                key={teacher.id}
                                className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  name="responsables"
                                  value={teacher.id}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedResponsables([...selectedResponsables, teacher.id]);
                                    } else {
                                      setSelectedResponsables(selectedResponsables.filter(id => id !== teacher.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="ml-3 text-sm text-gray-700">
                                  {teacher.nom} {teacher.prenom}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Aucun professeur disponible
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditMode ? "Enregistrer les modifications" : "Créer la classe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Form Modal */}
      {showAddSubjectForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Ajouter une Matière</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubject(new FormData(e.target as HTMLFormElement));
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la matière
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Ex: Mathématiques, Français..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coefficient
                  </label>
                  <input
                    type="number"
                    name="coefficient"
                    required
                    min="1"
                    max="10"
                    placeholder="4"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professeur
                  </label>
                  <select
                    name="teacher"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un professeur</option>
                    {schoolTeachers.map((teacher : Prof) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Ajouter la matière
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
