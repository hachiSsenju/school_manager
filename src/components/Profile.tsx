import { useState, useEffect } from 'react';
import { User, X, LogOut, School, UserCircle, Mail, Phone } from 'lucide-react';
import { SessionServices } from '../services/sessionServices';
import { AuthService } from '../services/authService';
import { EcoleService } from '../services/ecoleServices';
import { Ecole } from '../types';
import Swal from 'sweetalert2';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Profile({ isOpen, onClose }: ProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [schools, setSchools] = useState<Ecole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<Ecole | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentUser = SessionServices.getUser();
      const currentSchoolData = SessionServices.getSchool();
      setUser(currentUser);
      setCurrentSchool(currentSchoolData);

      // Fetch user's schools
      if (currentUser?.id) {
        EcoleService.getAll(currentUser.id)
          .then((response) => {
            setSchools(response.ecoles || []);
          })
          .catch((err) => {
            console.error('Error fetching schools:', err);
          });
      }
    }
  }, [isOpen]);

  const handleChangeSchool = async (school: Ecole) => {
    try {
      await SessionServices.setSelectedSchool(school);
      setCurrentSchool(school);
      Swal.fire({
        icon: 'success',
        title: `École changée : ${school.nom}`,
        text: 'Redirection en cours...',
        timer: 1500,
        showConfirmButton: false,
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      console.error('Error changing school:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de changer d\'école.',
      });
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Déconnexion',
      text: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, se déconnecter',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        AuthService.logout();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Mon Profil</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle size={20} />
              Mes Informations
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={32} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {user?.nom} {user?.prenom}
                  </p>
                  <p className="text-sm text-gray-500">Utilisateur</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900">{user?.telephone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schools Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <School size={20} />
              Mes Écoles
            </h3>
            <div className="space-y-3">
              {schools.length > 0 ? (
                schools.map((school) => (
                  <div
                    key={school.id}
                    className={`border rounded-lg p-4 flex items-center justify-between ${
                      currentSchool?.id === school.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{school.nom}</p>
                      {school.adresse && (
                        <p className="text-sm text-gray-500">{school.adresse}</p>
                      )}
                      {school.phone && (
                        <p className="text-sm text-gray-500">{school.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentSchool?.id === school.id && (
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                          Actuelle
                        </span>
                      )}
                      {currentSchool?.id !== school.id && (
                        <button
                          onClick={() => handleChangeSchool(school)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Sélectionner
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Aucune école disponible</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
