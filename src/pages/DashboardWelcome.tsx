import { useEffect, useState } from "react";
import { PlusCircle, School, Info } from "lucide-react";
import { Ecole } from "../types";
import { EcoleService } from "../services/ecoleServices";
import { SessionServices } from "../services/sessionServices";
// import { sessionUtils } from "../utils/sessionUtils";
import Swal from "sweetalert2";
import { AuthService } from "../services/authService";

export default function DashboardWelcomePage() {
  const [schools, setSchools] = useState<Ecole[]>([]);
  const [userName, setUserName] = useState<string>("Utilisateur");
  const [isLoading, setIsLoading] = useState(false);

  const MAX_SCHOOLS = 3;

  // ✅ Fetch connected user + their schools
  useEffect(() => {
    const fetchUserSchools = async () => {
      try {
        const user = SessionServices.getUser();
        if (user) setUserName(user.nom +" "+ user.prenom|| "Utilisateur");

        setIsLoading(true);
        const userSchools = await EcoleService.getAll(user?.id);
        setSchools(userSchools.ecoles || []);
      } catch (err) {
        console.error("Erreur lors du chargement des écoles :", err);
        window.location.reload();
      } finally {
        setIsLoading(false);
      }
    };
    setTimeout(fetchUserSchools,1000);
    // fetchUserSchools();
  }, []);

  // ✅ Add a new school
  const handleAddSchool = async () => {
    if (schools.length >= MAX_SCHOOLS) {
      Swal.fire({
        icon: "info",
        title: "Limite atteinte",
        text: "Vous avez déjà ajouté le nombre maximal de 3 écoles.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: "Ajouter une école",
      html: `
        <input id="school-name" class="swal2-input" placeholder="Nom de l'école" />
        <input id="school-phone" class="swal2-input" placeholder="Téléphone" />
        <input id="school-directeur" class="swal2-input" placeholder="Nom du directeur" />
      `,
      focusConfirm: false,
      confirmButtonText: "Enregistrer",
      confirmButtonColor: "#16a34a",
      showCancelButton: true,
      preConfirm: () => {
        const name = (document.getElementById("school-name") as HTMLInputElement)?.value.trim();
        const phone = (document.getElementById("school-phone") as HTMLInputElement)?.value.trim();
        const directeur = (document.getElementById("school-directeur") as HTMLInputElement)?.value.trim();
        if (!name || !phone || !directeur) {
          Swal.showValidationMessage("Veuillez remplir tous les champs.");
        }
        return { name, phone, directeur };
      },
    });

    if (formValues) {
      try {
        const user = SessionServices.getUser();
        await EcoleService.addSchool(formValues.name, formValues.phone, formValues.directeur);
        Swal.fire({
          icon: "success",
          title: "École ajoutée",
          text: "Votre école a été ajoutée avec succès.",
          timer: 1500,
          showConfirmButton: false,
        });

        const updatedSchools = await EcoleService.getAll(user?.id);
        setSchools(updatedSchools || []);
        setTimeout(()=>{
          window.location.reload();
        },2500);
      } catch (err) {
        console.error("Erreur lors de l'ajout :", err);
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: "Impossible d'ajouter l'école.",
        });
      }
    }
  };

  // ✅ Select a school
  const handleSelectSchool = (school: Ecole) => {
    SessionServices.setSelectedSchool(school);
    Swal.fire({
      icon: "success",
      title: `École sélectionnée : ${school.nom}`,
      text: "Chargement du tableau de bord...",
      timer: 1500,
      showConfirmButton: false,
    });
    setTimeout(()=>{
      window.location.href="/"
    },2500);
  };
useEffect(()=>{
  const getMe= async()=>{
     const user = await AuthService.me();
      // setLoggedUser(user);
      SessionServices.saveUser(user);
  }
  getMe();
},[])
  return  (

    <div className="p-6">
      <h1 className="text-3xl font-semibold text-gray-800 mb-4">
        👋 Bienvenue, <span className="text-green-600">{userName}</span>
      </h1>
      <p className="text-gray-600 mb-8">
        Gérez vos écoles ci-dessous. Vous pouvez en créer jusqu’à <strong>3 écoles maximum</strong>.
      </p>

      {isLoading ? (
        <p className="text-center text-gray-500">Chargement des écoles...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <div
              key={school.id}
              className="relative bg-white shadow-md rounded-2xl p-6 hover:shadow-lg transition cursor-pointer hover:-translate-y-1 border border-gray-100"
              onClick={() => handleSelectSchool(school)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 text-green-600 p-4 rounded-full mb-3">
                  <School size={40} />
                </div>
                <h2 className="text-lg font-semibold">{school.nom}</h2>
                <p className="text-sm text-gray-500">{school.adresse}</p>
              </div>
            </div>
          ))}

          {/* Empty spots with green "+" */}
          {Array.from({ length: MAX_SCHOOLS - schools.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              onClick={handleAddSchool}
              className="flex flex-col items-center justify-center bg-gray-50 hover:bg-green-50 border-2 border-dashed border-green-300 rounded-2xl p-6 cursor-pointer transition hover:shadow-lg hover:-translate-y-1"
            >
              <PlusCircle className="text-green-500 mb-2" size={48} />
              <p className="text-green-600 font-medium">Ajouter une école</p>
            </div>
          ))}
        </div>
      )}

      {/* Message when limit is reached */}
      {schools.length >= MAX_SCHOOLS && (
        <div className="mt-8 flex items-center gap-3 bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
          <Info className="text-yellow-500" size={22} />
          <p className="text-sm text-yellow-700">
            Vous avez atteint la limite de 3 écoles. Si vous souhaitez en gérer davantage,
            veuillez contacter l’administrateur.
          </p>
        </div>
      )}
    </div>
  );
}
