"use client";

import { useState } from "react";
import { User, Lock, Mail, LogIn, UserPlus, Phone } from "lucide-react";
import { AuthService } from "../services/authService";
import { SessionServices } from "../services/sessionServices";

export function AuthForms() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    nom: "test",
    prenom: "test",
    telephone: "+22211212",
    role_user: "client",
    email: "hachisenju49@gmail.com",
    password: "12345678",
  });

  async function handleSubmit() {
    try {
      if (isRegister) {
        const response = await AuthService.register(formData);
        if (response) {
          alert("User successfully registered");
        } else {
          console.error("Registration failed:", response.message);
        }
      } else {
        console.log("Logging in user:", formData);
        const response = await AuthService.login(
          formData.email,
          formData.password
        );
        if (response.token) {
          sessionStorage.setItem("access_token", response.token);
          window.location.reload(); // Reload to refresh the page state
        } else {
          console.error("Login failed:", response.message || "Unknown error");
        }
      }
    } catch (error) {
      console.error("An error occurred during form submission:", error);
    }
  }

  function handleChange(name: any, value: any) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-md rounded-lg w-full max-w-md p-6 border">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          {isRegister ? "Créer un compte" : "Se connecter"}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {isRegister && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    onChange={(e) => handleChange("nom", e.target.value)}
                    type="text"
                    name="nom"
                    required
                    placeholder="John "
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prenom
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    onChange={(e) => handleChange("prenom", e.target.value)}
                    type="text"
                    name="prenom"
                    required
                    placeholder=" Doe"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                onChange={(e) => handleChange("email", e.target.value)}
                type="email"
                name="email"
                required
                placeholder="exemple@mail.com"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  onChange={(e) => handleChange("telephone", e.target.value)}
                  type="tel"
                  name="telephone"
                  required
                  placeholder="+221 77 123 45 67"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                onChange={(e) => handleChange("password", e.target.value)}
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  // required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isRegister ? (
              <>
                <UserPlus size={18} />
                S’inscrire
              </>
            ) : (
              <>
                <LogIn size={18} />
                Connexion
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {isRegister ? (
            <>
              Déjà inscrit ?{" "}
              <button
                onClick={() => setIsRegister(false)}
                className="text-blue-600 hover:underline"
              >
                Se connecter
              </button>
            </>
          ) : (
            <>
              Pas encore de compte ?{" "}
              <a style={{color:"blue"}}href="https://wa.me/+221761436770?text=Bonjour Je suis intéressé par le logiciel de gestion scolaire">nous contacter</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
