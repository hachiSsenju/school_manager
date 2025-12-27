import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  User,
  BookOpen,
  Mail,
  Phone,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Ecole, Prof } from "../types";
import { EcoleService } from "../services/ecoleServices";
import { ProfsService } from "../services/profsService";
import { SessionServices } from "../services/sessionServices";
import Swal from 'sweetalert2';

export function Teachers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProf, setEditingProf] = useState<Prof | null>(null);
  const [error, setError] = useState<string>("");
  const [school, setSchool] = useState<Ecole | null>(null);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Get the school ID (from session or fixed for now)
  const schoolId = SessionServices.getSchoolId();

  // ✅ Fetch professors for current school
  useEffect(() => {
    const fetchSchoolProfs = async () => {
      try {
        const response = await EcoleService.getById(schoolId);
        console.log(response);
        if (response) {
          setSchool(response);
          setProfs(response.professeurs || []);
        } else {
          setError("École introuvable.");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l’école :", err);
        setError("Impossible de charger les professeurs.");
      }
    };

    fetchSchoolProfs();
  }, [schoolId]);

  const Refresh = async () => {
    try {
      const response = await EcoleService.getById(schoolId);
      if (response) {
        setSchool(response);
        setProfs(response.professeurs || []);
      }
    } catch (err) {
      console.error("Erreur lors de l’actualisation :", err);
    }
  };

  const filteredProfs = profs.filter((prof) =>
    `${prof.nom} ${prof.prenom}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleAddProfessor = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      // Check if we're in edit mode
      if (isEditMode && editingProf) {
        // Update existing professor
        await ProfsService.updateProf(editingProf.id, {
          nom: formData.get("lastName"),
          prenom: formData.get("firstName"),
          telephone: formData.get("phone"),
        });
      } else {
        // Add new professor
        await ProfsService.addProf({
          nom: formData.get("lastName"),
          prenom: formData.get("firstName"),
          telephone: formData.get("phone"),
          ecole_id: schoolId,
        });
      }

      Refresh();
      setShowAddForm(false);
      setIsEditMode(false);
      setEditingProf(null);

      Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Professeur modifié !' : 'Professeur ajouté !',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (err) {
      console.error("Erreur lors de l'ajout/modification du professeur :", err);
      // setError(isEditMode ? "Modification du professeur échouée." : "Ajout du professeur échoué.");
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: isEditMode ? "Modification échouée." : "Ajout échoué.",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (prof: Prof) => {
    setEditingProf(prof);
    setIsEditMode(true);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setIsEditMode(false);
    setEditingProf(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestion des Professeurs
        </h1>
        <button
          onClick={() => {
            setIsEditMode(false);
            setEditingProf(null);
            setShowAddForm(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Nouveau Professeur
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Rechercher un professeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Professeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfs.map((prof) => (
                <tr key={prof.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {prof.nom} {prof.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {prof.id}
                        </div>
                      </div>
                    </div>
                  </td>



                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-sm text-gray-700">
                      {/* <div className="flex items-center space-x-2">
                        <Mail size={14} />
                        <span>{prof.email || "—"}</span>
                      </div> */}
                      <div className="flex items-center space-x-2 mt-1">
                        <Phone size={14} />
                        <span>{prof.telephone || "—"}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(prof)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <Link to={`/teachers/${prof.id}`}>
                        <button className="text-green-600 hover:text-green-900 p-1 rounded">
                          <Eye size={16} />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProfs.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Aucun professeur trouvé.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Professor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              {isEditMode ? "Modifier le Professeur" : "Nouveau Professeur"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProfessor(new FormData(e.target as HTMLFormElement));
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
                    required
                    defaultValue={editingProf?.prenom || ""}
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
                    defaultValue={editingProf?.nom || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    defaultValue={editingProf?.telephone || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      {isEditMode ? "Enregistrer les modifications" : "Ajouter"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
