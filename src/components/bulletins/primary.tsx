import React, { useEffect, useState, useRef } from "react";
import { Student, Classe, Bulletin } from "../../types";
import { ClasseService } from "../../services/classeService";
import { GradeService } from "../../services/gradeService";

interface BulletinPrimaryProps {
  etudiant?: Student | null;
  classeT?: number | null;
  bulletin?: Bulletin | null;
  onRefresh?: () => void;
}

const ResultatsCompositions: React.FC<BulletinPrimaryProps> = ({
  etudiant,
  classeT,
  bulletin,
  onRefresh,
}) => {
  const [classe, setClasse] = useState<Classe>();
  const [isLoadingClasse, setIsLoadingClasse] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [noteValue, setNoteValue] = useState<string>("");
  const [formData, setFormData] = useState<{
    note?: number;
    matiere_id?: string;
    mois_id?: string;
    date: string;
    id?: string;
  }>({
    date: new Date().toISOString().split('T')[0],
  });
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Month labels in order
  const monthLabels = ["Oct.", "Nov.", "Déc.", "Jan.", "Févr.", "Mars", "Avril", "Mai", "Juin"];

  useEffect(() => {
    const getClasse = async () => {
      if (classeT) {
        setIsLoadingClasse(true);
        try {
          const response = await ClasseService.getById(classeT);
          setClasse(response);
        } catch (error) {
          console.error("Error loading classe:", error);
        } finally {
          setIsLoadingClasse(false);
        }
      } else {
        setIsLoadingClasse(false);
      }
    };
    getClasse();
  }, [classeT]);

  // Helper function to get GradeP for a matiere in a specific month (with id for editing)
  const getGradePForMatiereAndMonth = (matiereId: string, monthLibelle: string) => {
    if (!bulletin?.mois) return null;
    
    const month = bulletin.mois.find(m => m.libelle === monthLibelle);
    if (!month) return null;
    
    const gradeP = month.gradeP?.find(g => String(g.matiere.id) === String(matiereId));
    return gradeP || null;
  };

  // Helper function to get note for a matiere in a specific month
  const getNoteForMatiereAndMonth = (matiereId: string, monthLibelle: string): number | null => {
    const gradeP = getGradePForMatiereAndMonth(matiereId, monthLibelle);
    return gradeP ? gradeP.note : null;
  };

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD for date input
  const convertDateToInputFormat = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // If already in YYYY-MM-DD format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // If in DD/MM/YYYY format, convert it
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback to today
    return new Date().toISOString().split('T')[0];
  };

  // Function to open grade form
  const openGradeForm = (matiereId: string, monthLibelle: string) => {
    const existingGradeP = getGradePForMatiereAndMonth(matiereId, monthLibelle);
    const month = bulletin?.mois?.find(m => m.libelle === monthLibelle);
    
    const formDataToSet = {
      note: existingGradeP?.note,
      matiere_id: matiereId,
      mois_id: month?.id || "",
      date: existingGradeP?.date 
        ? convertDateToInputFormat(existingGradeP.date) 
        : new Date().toISOString().split('T')[0],
      id: existingGradeP?.id,
    };
    
    setFormData(formDataToSet);
    setNoteValue(existingGradeP?.note ? String(existingGradeP.note) : "");
    setShowForm(true);
  };

  // Helper function to calculate total for a month
  const calculateTotalForMonth = (monthLibelle: string): number => {
    if (!classe?.matieres || !bulletin?.mois) return 0;
    
    const month = bulletin.mois.find(m => m.libelle === monthLibelle);
    if (!month || !month.gradeP) return 0;
    
    return month.gradeP.reduce((sum, grade) => sum + grade.note, 0);
  };

  // Helper function to format rank as French ordinal
  const formatRank = (rank: number): string => {
    if (rank === 0 || !rank) return "";
    if (rank === 1) return "1er";
    if (rank === 2) return "2ème";
    if (rank === 3) return "3ème";
    return `${rank}ème`;
  };

  // Helper function to calculate average for a month (weighted by coefficients)
  const calculateAverageForMonth = (monthLibelle: string): number => {
    if (!classe?.matieres || !bulletin?.mois) return 0;
    
    const month = bulletin.mois.find(m => m.libelle === monthLibelle);
    if (!month || !month.gradeP || month.gradeP.length === 0) return 0;
    
    // Calculate weighted sum (note * coefficient) and sum of coefficients
    let weightedSum = 0;
    let totalCoefficients = 0;
    
    month.gradeP.forEach((grade) => {
      const matiere = classe.matieres.find(m => String(m.id) === String(grade.matiere.id));
      const coefficient = matiere?.coefficient || grade.matiere.coef || 1;
      weightedSum += grade.note * coefficient;
      totalCoefficients += coefficient;
    });
    
    if (totalCoefficients === 0) return 0;
    
    return weightedSum / totalCoefficients;
  };

  // Helper function to calculate annual average (sum of all monthly averages / 9)
  const calculateAnnualAverage = (): number => {
    if (!bulletin?.mois || monthLabels.length === 0) return 0;
    
    let sumOfAverages = 0;
    
    monthLabels.forEach((monthLibelle) => {
      const average = calculateAverageForMonth(monthLibelle);
      sumOfAverages += average;
    });
    
    return sumOfAverages / 9;
  };

  // Show loader while data is being fetched
  if (isLoadingClasse) {
    return (
      <div className="bg-yellow-100 text-black p-6 rounded-lg shadow-md max-w-3xl mx-auto border border-yellow-300 font-serif text-xs">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Chargement du bulletin...</p>
        </div>
      </div>
    );
  }

  // Get classe name from bulletin or from fetched classe
  const classeNom = typeof bulletin?.classe === 'string' 
    ? bulletin.classe 
    : bulletin?.classe?.nom || classe?.nom || "N/A";
  
  // Get student from bulletin if available, otherwise use etudiant prop
  const student = bulletin?.eleve || etudiant;

  return (
    <div className="bg-yellow-100 text-black p-6 rounded-lg shadow-md max-w-3xl mx-auto border border-yellow-300 font-serif text-xs">
      {/* HEADER */}
      <div className="flex items-start gap-4 mb-4 leading-tight font-serif">
        {/* Logo Placeholder */}
        <div className="flex-shrink-0 w-20 h-20 border-2 border-gray-400 bg-white flex items-center justify-center">
          <span className="text-[8px] text-gray-500 text-center">LOGO</span>
        </div>
        {/* Header Text */}
        <div className="flex-1 text-center">
          <h2 className="font-bold text-sm uppercase">République du Mali</h2>
          <p className="font-serif">Ministère de l'Éducation Nationale</p>
          {/* <p className="font-serif">Académie d'Enseignement Bamako – Rive Droite</p> */}
          {/* <p className="font-serif">Centre d'Animation Pédagogique de Baco-Djicoroni</p> */}
          <h2 className="font-bold text-sm uppercase mt-2">
            {student?.ecole?.nom || etudiant?.ecole?.nom}
          </h2>
          <p className="text-[11px] font-serif">Tél : {student?.ecole?.phone || etudiant?.ecole?.phone}</p>
        </div>
      </div>

      {/* ÉTUDIANT INFO */}
      <div className="flex justify-between border border-black p-2 text-[11px] mb-0 font-serif">
        <div className="flex gap-10">
          <p className="font-serif">
            <strong>RÉSULTATS DES COMPOSITIONS NIVEAU I</strong>
          </p>
          <p className="font-serif">
            <strong>BULLETIN ANNUEL</strong>
          </p>
          <p className="font-serif">
            <strong>ANNEE SCOLAIRE 2024-2025</strong>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border border-black p-2 text-[11px] mb-3 font-serif">
        <div>
          <p>
            <strong>Matricule:</strong> {student?.matricule || "N/A"}
          </p>
          <p>
            <strong>Élève:</strong> {student?.prenom} {student?.nom}
          </p>
          <p>
            <strong>Né(e) le:</strong> {student?.birthday || "N/A"} à{" "}
            {student?.birthplace || "N/A"}
          </p>
          <p>
            <strong>Sexe:</strong>{" "}
            {student?.sexe === "M"
              ? "Masculin"
              : student?.sexe === "F"
              ? "Féminin"
              : "N/A"}
          </p>
        </div>
        <div>
          <p>
            <strong>Classe:</strong> {classeNom}
          </p>
          <p>
            <strong>Redoublant:</strong> Non
          </p>
          <p>
            <strong>Effectif:</strong> {classe?.eleves?.length || "N/A"} élèves
          </p>
          <p>
            <strong>Année Scolaire:</strong> 2024 – 2025
          </p>
        </div>
      </div>

      {/* TABLEAU DES NOTES */}
      <table className="w-full border-collapse border border-black text-[10px]">
        <thead className="bg-yellow-200 font-serif">
          <tr>
            <th className="border border-black p-2 text-left">MATIÈRES</th>
            <th className="border border-black p-2">Oct.</th>
            <th className="border border-black p-2">Nov.</th>
            <th className="border border-black p-2">Déc.</th>
            <th className="border border-black p-2">Jan.</th>
            <th className="border border-black p-2">Févr.</th>
            <th className="border border-black p-2">Mars</th>
            <th className="border border-black p-2">Avril</th>
            <th className="border border-black p-2">Mai</th>
            <th className="border border-black p-2">Juin</th>
          </tr>
        </thead>

        <tbody className="font-serif">
          {classe?.matieres?.map((matiere, idx) => (
            <tr key={idx}>
              <td className="border border-black p-1 text-left">
                {matiere.nom}
              </td>
              {monthLabels.map((monthLibelle) => {
                const note = getNoteForMatiereAndMonth(String(matiere.id), monthLibelle);
                return (
                  <td 
                    key={monthLibelle} 
                    className="border border-black p-1 text-center cursor-pointer hover:bg-yellow-50"
                    onClick={() => openGradeForm(String(matiere.id), monthLibelle)}
                    title="Cliquez pour ajouter/modifier la note"
                  >
                    {note !== null ? note : ""}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="bg-yellow-200 font-bold">
            <td className="border border-black p-1 text-left">TOTAL</td>
            {monthLabels.map((monthLibelle) => {
              const total = calculateTotalForMonth(monthLibelle);
              return (
                <td key={monthLibelle} className="border border-black p-1 text-center">
                  {total > 0 ? total.toFixed(2) : ""}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border border-black p-1 text-left font-semibold">
              Moyenne Compo.
            </td>
            {monthLabels.map((monthLibelle) => {
              const average = calculateAverageForMonth(monthLibelle);
              return (
                <td key={monthLibelle} className="border border-black p-1 text-center">
                  {average > 0 ? average.toFixed(2) : ""}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border border-black p-1 text-left font-semibold">
              Rang
            </td>
            {monthLabels.map((monthLibelle) => {
              // Find the month object from bulletin to get its rank
              const month = bulletin?.mois?.find(m => m.libelle === monthLibelle);
              const rank = month?.rank;
              const moyenne = month?.moyenne;
              
              return (
                <td key={monthLibelle} className="border border-black p-1 text-center">
                  {rank !== null && rank !== undefined && rank > 0 && moyenne !== null && moyenne !== undefined ? formatRank(rank) : ""}
                </td>
              );
            })}
          </tr>
          {/* <tr>
            <td className="border border-black p-1 text-left font-semibold">
              Moy. du 1er du Mois
            </td>
            {monthLabels.map((monthLibelle) => (
              <td key={monthLibelle} className="border border-black p-1 text-center"></td>
            ))}
          </tr> */}
        </tbody>
      </table>

      {/* CLASSEMENT ANNUEL */}
      <div className="mt-4 text-[11px] border border-black p-2 font-serif">
        <h3 className="font-bold text-sm underline mb-2 text-center">CLASSEMENT ANNUEL</h3>
        <div className="grid grid-cols-2 gap-2">
          <p>
            <strong>Moyenne Annuelle :</strong>  &nbsp;&nbsp;
            {(() => {
              const annualAvg = calculateAnnualAverage();
              return annualAvg > 0 ? annualAvg.toFixed(2) : "";
            })()}
            {/* <strong>Rang :</strong>  */}
            {/* Xème / X élèves classés */}
          </p>
          {/* <p>
            <strong>Moyenne du 1er :</strong> X / 10
          </p> */}
        </div>
      </div>

      {/* OBSERVATIONS */}
      <div className="mt-4 text-[11px] border border-black p-2 font-serif">
        <h3 className="font-bold text-sm underline mb-2 text-center">OBSERVATIONS</h3>
        <table className="w-full border border-black text-center font-serif">
          <thead className="bg-yellow-100 font-serif">
            <tr>
              <th className="border border-black p-2 font-semibold ">
                Le Maître
              </th>
              <th className="border border-black p-2 font-semibold ">
                La Directrice
              </th>
              <th className="border border-black p-2 font-semibold ">
                Les Parents
              </th>
            </tr>
          </thead>
          <tbody className="font-serif">
            <tr>
              <td className="border border-black h-24 align-bottom p-2">
                
              </td>
              <td className="border border-black h-24 align-bottom p-2">
                <div className="h-20 flex flex-col justify-between text-sm italic">
               
                </div>
              </td>
              <td className="border border-black h-24 align-bottom p-2">
                
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] italic mt-2 text-center border-t pt-2 font-serif">
        NOTE IMPORTANTE: Aucun duplicata de ce bulletin ne sera autorisé.
      </p>

      {/* Modal for adding/editing grade */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 font-serif">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4 font-serif">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                {formData.id ? "Modifier la note" : "Ajouter une note"}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowForm(false);
                  setNoteValue("");
                  setShowKeyboard(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600">Matière</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    readOnly
                    value={classe?.matieres?.find(m => String(m.id) === formData.matiere_id)?.nom || ""}
                  />
                </div>
                <div>
                  <label className="block text-gray-600">Mois</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    readOnly
                    value={bulletin?.mois?.find(m => m.id === formData.mois_id)?.libelle || ""}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-600">Date</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600">Note (Max 20)</label>
                <input
                  ref={noteInputRef}
                  className="w-full border rounded px-2 py-1"
                  type="text"
                  inputMode="decimal"
                  placeholder="Saisir la note"
                  value={noteValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteValue(val);
                    if (val.trim() === "") {
                      setFormData({ ...formData, note: undefined });
                      return;
                    }
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                      setFormData({ ...formData, note: parsed });
                    }
                  }}
                  onFocus={() => setShowKeyboard(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
                
                {/* Mini Keyboard */}
                {showKeyboard && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-300 rounded">
                    <div className="grid grid-cols-3 gap-1 mb-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            const newVal = noteValue + num;
                            setNoteValue(newVal);
                            const parsed = parseFloat(newVal);
                            if (!isNaN(parsed)) {
                              setFormData({ ...formData, note: parsed });
                            }
                          }}
                          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-700"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1 mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = noteValue + "0";
                          setNoteValue(newVal);
                          const parsed = parseFloat(newVal);
                          if (!isNaN(parsed)) {
                            setFormData({ ...formData, note: parsed });
                          }
                        }}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-700"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = noteValue + ".";
                          setNoteValue(newVal);
                        }}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-700"
                      >
                        .
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = noteValue.slice(0, -1);
                          setNoteValue(newVal);
                          if (newVal) {
                            const parsed = parseFloat(newVal);
                            if (!isNaN(parsed)) {
                              setFormData({ ...formData, note: parsed });
                            } else {
                              setFormData({ ...formData, note: undefined });
                            }
                          } else {
                            setFormData({ ...formData, note: undefined });
                          }
                        }}
                        className="px-2 py-1 bg-red-50 border border-red-300 text-red-600 rounded hover:bg-red-100 text-xs font-medium"
                      >
                        ⌫
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteValue("20");
                          setFormData({ ...formData, note: 20 });
                        }}
                        className="px-2 py-1 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 font-medium text-blue-700 text-xs"
                      >
                        Max
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowKeyboard(false)}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium text-xs col-span-2"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex justify-between gap-2">
              <div>
                {/* {formData.id && (
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700"
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (window.confirm("Êtes-vous sûr de vouloir supprimer la note ?")) {
                        setIsSubmitting(true);
                        try {
                          await GradeService.deleteGradeP(formData.id);
                          console.log("GradeP deleted successfully");
                          
                          // Refresh the bulletin data first
                          if (onRefresh) {
                            await onRefresh();
                          }
                          
                          // Close the form after refresh
                          setShowForm(false);
                          setNoteValue("");
                          setShowKeyboard(false);
                        } catch (error) {
                          console.error("Error deleting grade:", error);
                          alert("Erreur lors de la suppression de la note");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }
                    }}
                  >
                    Supprimer
                  </button>
                )} */}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => {
                    setShowForm(false);
                    setNoteValue("");
                    setShowKeyboard(false);
                  }}
                >
                  Annuler
                </button>
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                  disabled={formData.note === undefined || isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      const payload = {
                        note: formData.note,
                        date: formData.date,
                        matiere_id: parseInt(formData.matiere_id || "0"),
                        mois_id: parseInt(formData.mois_id || "0"),
                        ...(formData.id && { id: formData.id }),
                      };
                      console.log("GradeP to submit:", payload);
                      await GradeService.addGradeP(payload);
                      console.log("GradeP saved successfully");
                      
                      // Close the form immediately
                      setShowForm(false);
                      setNoteValue("");
                      setShowKeyboard(false);
                      
                      // Refresh the bulletin data
                      if (onRefresh) {
                        onRefresh();
                      }
                    } catch (error) {
                      console.error("Error saving grade:", error);
                      alert("Erreur lors de l'enregistrement de la note");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultatsCompositions;
