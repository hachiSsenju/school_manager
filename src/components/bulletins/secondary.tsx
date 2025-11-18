import React, { useEffect, useRef, useState, useCallback } from "react";
import { Student, Classe, Bulletin, GradeH } from "../../types";
import { ClasseService } from "../../services/classeService";
import { GradeService } from "../../services/gradeService";
import { MoyenneService, CycleData, MoyenneEntry } from "../../services/moyenneService";
import { BulletinService } from "../../services/bulletinService";
import logo from '../../assets/images/logo.png';
interface BulletinProps {
  etudiant: Student | null;
  classeT: number | null;
  bulletin: Bulletin;
  onRefresh?: () => void;
  highlightedTrimester?: number | null;
}

const BulletinSecondTrimester: React.FC<BulletinProps> = ({
  etudiant,
  classeT,
  bulletin,
  onRefresh,
  highlightedTrimester: propHighlightedTrimester,
}) => {
  const [classe, setClasse] = useState<Classe>();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [noteValue, setNoteValue] = useState<string>("");
  const [highlightedTrimester, setHighlightedTrimester] = useState<number | null>(propHighlightedTrimester ?? null);
  const [ranks, setRanks] = useState<{ [cycleIndex: number]: number }>({});
  const [isLoadingClasse, setIsLoadingClasse] = useState(true);
  const [isLoadingRanks, setIsLoadingRanks] = useState(false);
  const [formData, setFormData] = useState<{
    note?: number;
    type: string;
    trimester_id?: number;
    cycle_id?: number;
    trimesterIndex?: number;
    matiere_id?: string;
    date: string;
    id?: number;
  }>({
    type: "",
    date: new Date().toISOString().split('T')[0],
  });
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getClasse = async () => {
      setIsLoadingClasse(true);
      try {
        const response = await ClasseService.getById(classeT || 0);
        setClasse(response);
      } catch (error) {
        console.error("Error loading classe:", error);
      } finally {
        setIsLoadingClasse(false);
      }
    };
    getClasse();
  }, [classeT]);

  // Fetch ranks for all cycle indices
  useEffect(() => {
    const fetchRanks = async () => {
      if (!classeT || !etudiant?.id || !bulletin?.cycles) {
        setIsLoadingRanks(false);
        return;
      }
      
      setIsLoadingRanks(true);
      const ranksData: { [cycleIndex: number]: number } = {};
      
      try {
        // Fetch all cycles data from new API structure
        const response = await MoyenneService.getAllByClasseId(classeT);
        if (response && response.cycles && Array.isArray(response.cycles)) {
          // Process each cycle position
          response.cycles.forEach((cycle: CycleData) => {
            const cyclePosition = cycle.cycle_position; // 1-based
            const cycleIndex = cyclePosition - 1; // Convert to 0-based index
            
            if (cycle.entries && Array.isArray(cycle.entries)) {
              // Find current student's entry
              const studentEntry = cycle.entries.find((entry: MoyenneEntry) => 
                String(entry.eleve_id) === String(etudiant.id)
              );
              
              // Use the rank directly from the API response
              if (studentEntry && studentEntry.rank != null) {
                ranksData[cycleIndex] = studentEntry.rank;
              }
            }
          });
        }
      } catch (error) {
        console.error("Error fetching ranks:", error);
      }
      
      setRanks(ranksData);
      setIsLoadingRanks(false);
    };
    
    fetchRanks();
  }, [classeT, etudiant?.id, bulletin?.cycles]);

  // Update highlighted trimester when prop changes
  useEffect(() => {
    setHighlightedTrimester(propHighlightedTrimester ?? null);
  }, [propHighlightedTrimester]);

  useEffect(() => {
    if (showForm) {
      noteInputRef.current?.focus();
      noteInputRef.current?.select();
    }
  }, [showForm]);

  // Helper function to get grade by matiere, trimester index, and type from a specific bulletin
  const getGradeByTrimesterFromBulletin = (
    bulletinData: Bulletin,
    matiereId: string,
    trimesterIndex: number,
    type: string
  ): GradeH | undefined => {
    if (!bulletinData?.cycles || trimesterIndex >= bulletinData.cycles.length) return undefined;
    const trimester = bulletinData.cycles[trimesterIndex];
    if (!trimester?.gradeH || trimester.gradeH.length === 0) return undefined;
    
    return trimester.gradeH.find((g) => {
      const gradeMatiereId =
        typeof g.matiere === "object" && g.matiere !== null
          ? String(g.matiere.id || g.matiere)
          : String(g.matiere);
      return gradeMatiereId === String(matiereId) && g.type === type;
    });
  };

  // Helper function to get grade by matiere, trimester index, and type (uses current bulletin prop)
  const getGradeByTrimester = (
    matiereId: string,
    trimesterIndex: number,
    type: string
  ): GradeH | undefined => {
    return getGradeByTrimesterFromBulletin(bulletin, matiereId, trimesterIndex, type);
  };

  // Calculate total points and total coefficient for a specific trimester from a specific bulletin
  const calculateTotalsForTrimesterFromBulletin = (bulletinData: Bulletin, trimesterIndex: number) => {
    if (!classe?.matieres) return { totalPoints: 0, totalCoef: 0, average: 0 };
    let totalPoints = 0;
    let totalCoef = 0;
    classe.matieres.forEach((matiere) => {
      const classeGrade = getGradeByTrimesterFromBulletin(bulletinData, matiere.id, trimesterIndex, "classe");
      const compoGrade = getGradeByTrimesterFromBulletin(bulletinData, matiere.id, trimesterIndex, "composition");
      if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
        // Trim. Moy. = (Classe (/20) + Compo (/40)) / 2
        const avg = (classeGrade.note + compoGrade.note / 2) / 2;
        const weighted = avg * (matiere.coefficient || 1);
        totalPoints += weighted;
        totalCoef += matiere.coefficient || 1;
      }
    });
    const average = totalCoef > 0 ? totalPoints / totalCoef : 0;
    return { 
      totalPoints: Math.round(totalPoints * 100) / 100, 
      totalCoef, 
      average: Math.round(average * 100) / 100 
    };
  };

  // Calculate total points and total coefficient for a specific trimester (uses current bulletin prop)
  const calculateTotalsForTrimester = (trimesterIndex: number) => {
    return calculateTotalsForTrimesterFromBulletin(bulletin, trimesterIndex);
  };

  // Calculate totals for all trimesters
  const totals1er = calculateTotalsForTrimester(0);
  const totals2eme = calculateTotalsForTrimester(1);
  const totals3eme = calculateTotalsForTrimester(2);
  
  // Calculate yearly average (moyen annuel) - use API moyennes if available, otherwise use calculated
  const apiAverages = bulletin?.cycles
    ?.map(cycle => cycle.moyenne)
    .filter((m): m is number => m !== null && m !== undefined && m > 0) || [];
  const calculatedAverages = [totals1er.average, totals2eme.average, totals3eme.average].filter(a => a > 0);
  const allAverages = apiAverages.length > 0 ? apiAverages : calculatedAverages;
  const moyenneAnnuelle = allAverages.length > 0 
    ? Math.round((allAverages.reduce((a, b) => a + b, 0) / allAverages.length) * 100) / 100 
    : 0;

  // Determine current trimester index (1er=0, 2ème=1, 3ème=2)

  // Get the total for the current trimester for use in other calculations

  // Helper to format rank as French ordinal
  const formatRank = (rank: number): string => {
    if (rank === 0) return "";
    if (rank === 1) return "1er";
    if (rank === 2) return "2ème";
    if (rank === 3) return "3ème";
    return `${rank}ème`;
  };

  // Calculate rank for a specific trimester based on moyennes
  // Compares students based on classe_id + trimester_index (position in bulletin's cycles array)
  // trimesterIndex refers to the position (0, 1, 2) in the bulletin's cycles array:
  //   0 = premier trimestre, 1 = deuxième trimestre, 2 = troisième trimestre
  const calculateRankForTrimester = useCallback((trimesterIndex: number): number => {
    if (!etudiant?.moyenne || !etudiant?.moyennes || !bulletin?.cycles) {
      return 0;
    }
    
    // Get current bulletin ID for comparison
    const currentBulletinId = bulletin?.id ? (typeof bulletin.id === 'string' ? parseInt(bulletin.id) : bulletin.id) : null;
    
    // Use bulletin's classe ID if available, otherwise fall back to classe prop
    const bulletinClasseId = bulletin?.classe?.id ? (typeof bulletin.classe.id === 'string' ? parseInt(bulletin.classe.id) : bulletin.classe.id) : null;
    const classeId = bulletinClasseId || (typeof classe?.id === 'string' ? parseInt(classe.id) : (classe?.id || 0));

    // Find the current student's moyenne for this bulletin and trimester index
    const studentMoyenneItem = etudiant.moyenne.find(
      (m) => {
        const mBulletinId = typeof m.bulletin_id === 'string' ? parseInt(m.bulletin_id) : m.bulletin_id;
        const mClasseId = typeof m.classe_id === 'string' ? parseInt(m.classe_id) : m.classe_id;
        const mTrimesterIndex = typeof m.trimester_index === 'string' ? parseInt(m.trimester_index) : m.trimester_index;
        // Match by bulletin_id, classe_id, and trimester_index (position in cycles array)
        return mBulletinId === currentBulletinId && mClasseId === classeId && mTrimesterIndex === trimesterIndex;
      }
    );

    if (!studentMoyenneItem) {
      return 0;
    }

    // Get all students' moyennes for ranking comparison
    // Compare students in the same class with the same trimester_index (same trimester position)
    // Each student has their own bulletin, so we match by classe_id + trimester_index only
    // The trimester_index (0, 1, 2) represents the position in each student's bulletin cycles array
    // Include all students, even those with value 0, so we can properly rank
    const trimesterMoyennes = etudiant.moyennes
      .map((student) => {
        const studentMoyenne = student.moyennes.find(
          (m) => {
            const mClasseId = typeof m.classe_id === 'string' ? parseInt(m.classe_id) : m.classe_id;
            const mTrimesterIndex = typeof m.trimester_index === 'string' ? parseInt(m.trimester_index) : m.trimester_index;
            // Match by classe_id and trimester_index (position in cycles array)
            // All students in the same class with same trimester_index are compared together
            return mClasseId === classeId && mTrimesterIndex === trimesterIndex;
          }
        );
        return {
          student_id: student.student_id,
          value: studentMoyenne?.value ?? 0,
        };
      });

    // If no student has any grades (all values are 0), return 0
    const hasAnyGrades = trimesterMoyennes.some(m => m.value > 0);
    if (!hasAnyGrades) {
      return 0;
    }

    if (trimesterMoyennes.length === 0) {
      return 0;
    }

    // Sort by value descending
    trimesterMoyennes.sort((a, b) => b.value - a.value);

    // Find rank (handling ties)
    for (let i = 0; i < trimesterMoyennes.length; i++) {
      const studentIdStr = String(trimesterMoyennes[i].student_id);
      const etudiantIdStr = String(etudiant.id);
      
      if (studentIdStr === etudiantIdStr) {
        // Look backwards to find where ties start
        let currentRank = i + 1;
        for (let j = i - 1; j >= 0; j--) {
          if (Math.abs(trimesterMoyennes[j].value - trimesterMoyennes[i].value) < 0.01) {
            currentRank = j + 1;
          } else {
            break;
          }
        }
        return currentRank;
      }
    }

    return 0;
  }, [etudiant, bulletin, classe]);

  // Helper to get rank for a specific trimester
  const getRankForTrimester = (trimesterIndex: number) => {
    return calculateRankForTrimester(trimesterIndex);
  };

  // Function to open grade form
  const openGradeForm = (matiereId: string, trimesterIndex: number, type: string) => {
    const existingGrade = getGradeByTrimester(matiereId, trimesterIndex, type);
    const trimester = bulletin?.cycles?.[trimesterIndex];
    console.log("Trimester Index:", trimesterIndex);
    console.log("Trimester :", trimester?.libelle);
    console.log("Rang :", trimester?.rank);
    const formDataToSet = {
      note: existingGrade?.note,
      type: type,
      trimester_id: parseInt(bulletin.trimester?.id || "0"),
      cycle_id: parseInt(trimester?.id || "0"),
      trimesterIndex: trimesterIndex, // Add trimesterIndex to formData
      matiere_id: matiereId,
      date: existingGrade?.date || new Date().toISOString().split('T')[0],
      id: existingGrade?.id ? parseInt(existingGrade.id) : undefined,
    };
    
    setFormData(formDataToSet);
    setNoteValue(existingGrade?.note ? String(existingGrade.note) : "");
    
    // Log payload as it would be sent to API
    // Note: cycle_id is still required by backend API for GradeH entity
    const payload = {
      note: formDataToSet.note,
      type: formDataToSet.type,
      date: formDataToSet.date,
      cycle_id: formDataToSet.cycle_id, // Backend still uses cycle entity internally
      matiere_id: parseInt(formDataToSet.matiere_id || "0"),
      eleve_id: etudiant?.id,
      bulletin_id: bulletin.id,
      ...(formDataToSet.id && { id: formDataToSet.id }),
    };
    
    console.log("Payload on cell click:", payload);
    
    setShowForm(true);
  };

  // Show loader while data is being fetched
  if (isLoadingClasse || isLoadingRanks) {
    return (
      <div className="bg-white text-black p-6 rounded-lg shadow-md max-w-4xl mx-auto border border-gray-400 font-serif text-xs">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Chargement du bulletin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-black p-6 rounded-lg shadow-md max-w-4xl mx-auto border border-gray-400 font-serif text-xs">
      {/* HEADER */}
      <div className="flex items-start gap-4 mb-4 leading-tight font-serif">
        {/* Logo Placeholder */}
        <div className="flex-shrink-0 w-20 h-20 border-2 border-gray-400 bg-white flex items-center justify-center">
          <img src={logo} alt="logo" className="max-h-full max-w-full" />
        </div>
        {/* Header Text */}
        <div className="flex-1 text-center">
          <h2 className="font-bold text-sm uppercase">République du Mali</h2>
          <p className="font-serif">Ministère de l'Éducation Nationale</p>
          {/* <p className="font-serif">Académie d'Enseignement Bamako – Rive Droite</p> */}
          {/* <p className="font-serif">Centre d'Animation Pédagogique de Baco-Djicoroni</p> */}
          <h2 className="font-bold text-sm uppercase mt-2">
            {etudiant?.ecole.nom}
          </h2>
          <p className="text-[11px] font-serif">Tél : {etudiant?.ecole.phone}</p>
        </div>
      </div>

      {/* ÉTUDIANT INFO */}
      <div className="flex justify-between border border-black p-2 text-[11px] mb-0 font-serif">
        <div className="flex gap-10">
          <p className="font-serif">
            <strong>BULLETIN DE NOTES 2ème TRIMESTRE</strong>
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
            <strong>Matricule:</strong> {etudiant?.matricule || "N/A"}
          </p>
          <p>
            <strong>Élève:</strong> {etudiant?.prenom} {etudiant?.nom}
          </p>
          <p>
            <strong>Né(e) le:</strong> {etudiant?.birthday || "N/A"} à{" "}
            {etudiant?.birthplace || "N/A"}
          </p>
          <p>
            <strong>Sexe:</strong>{" "}
            {etudiant?.sexe === "M"
              ? "Masculin"
              : etudiant?.sexe === "F"
              ? "Féminin"
              : "N/A"}
          </p>
        </div>
        <div>
          <p>
            <strong>Classe:</strong> {classe?.nom || "N/A"}
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
      <table className="w-full border-collapse border border-black text-[10px] ">
        <thead className="bg-gray-100 ">
          <tr>
            <th rowSpan={2} className="border border-black p-1">
              MATIÈRES
            </th>
            <th rowSpan={2} className="border border-black p-1">
              Coef.
            </th>
            <th colSpan={4} className={`border border-black p-1 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
              PREMIER TRIMESTRE
            </th>
            <th colSpan={4} className={`border border-black p-1 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
              DEUXIÈME TRIMESTRE
            </th>
            <th colSpan={4} className={`border border-black p-1 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
              TROISIÈME TRIMESTRE
            </th>
          </tr>
          <tr>
            {/* 1er Trimestre headers */}
            <th className={`border border-black p-1 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>Classe .Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>Compo Note/40.</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>Trim. Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>Moy.Tri</th>
            {/* 2ème Trimestre headers */}
            <th className={`border border-black p-1 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>Classe .Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>Compo Note/40.</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>Trim. Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>Moy.Tri</th>
            {/* 3ème Trimestre headers */}
            <th className={`border border-black p-1 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>Classe .Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>Compo Note/40.</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>Trim. Moy/20</th>
            <th className={`border border-black p-1 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>Moy.Tri</th>
          </tr>
        </thead>

        <tbody className="font-serif">
          {classe?.matieres?.map((matiere, i) => {
            return (
              <tr key={i}>
                <td className="border border-black p-1 text-left" >
                  {matiere.nom}
                </td>
                <td className="border border-black p-1 text-center">
                  {matiere.coefficient || 1}
                </td>

                {/* Premier trimestre */}
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`} 
                  onClick={() => openGradeForm(matiere.id, 0, "classe")}
                  title="Click to add/edit class note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 0, "classe");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}
                  onClick={() => openGradeForm(matiere.id, 0, "composition")}
                  title="Click to add/edit composition note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 0, "composition");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 0, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 0, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. = (Classe (/20) + Compo (/40)) / 2
                      // Normalize Compo to /20 scale by dividing by 2
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      return Math.round(avg * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 0, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 0, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. × Coef.
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      const weighted = avg * (matiere.coefficient || 1);
                      return Math.round(weighted * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>

                {/* Deuxième trimestre */}
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}
                  onClick={() => openGradeForm(matiere.id, 1, "classe")}
                  title="Click to add/edit class note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 1, "classe");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}
                  onClick={() => openGradeForm(matiere.id, 1, "composition")}
                  title="Click to add/edit composition note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 1, "composition");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 1, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 1, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. = (Classe (/20) + Compo (/40)) / 2
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      return Math.round(avg * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 1, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 1, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. × Coef.
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      const weighted = avg * (matiere.coefficient || 1);
                      return Math.round(weighted * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>

                {/* Troisième trimestre */}
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}
                  onClick={() => openGradeForm(matiere.id, 2, "classe")}
                  title="Click to add/edit class note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 2, "classe");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td 
                  className={`border border-black p-1 text-center cursor-pointer hover:bg-yellow-50 ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}
                  onClick={() => openGradeForm(matiere.id, 2, "composition")}
                  title="Click to add/edit composition note"
                >
                  {(() => {
                    const grade = getGradeByTrimester(matiere.id, 2, "composition");
                    return grade?.note !== undefined ? grade.note : "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 2, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 2, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. = (Classe (/20) + Compo (/40)) / 2
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      return Math.round(avg * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>
                <td className={`border border-black p-1 text-center ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
                  {(() => {
                    const classeGrade = getGradeByTrimester(matiere.id, 2, "classe");
                    const compoGrade = getGradeByTrimester(matiere.id, 2, "composition");
                    if (classeGrade?.note !== undefined && compoGrade?.note !== undefined) {
                      // Trim. Moy. × Coef.
                      const avg = (classeGrade.note + compoGrade.note / 2) / 2;
                      const weighted = avg * (matiere.coefficient || 1);
                      return Math.round(weighted * 100) / 100; // Round to 2 decimals
                    }
                    return "";
                  })()}
                </td>
              </tr>
            );
          })}

          {/* Totaux */}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-black p-1 text-left">TOTAL</td>
            <td className="border border-black p-1 text-center">
              {classe?.matieres?.reduce(
                (sum, m) => sum + (m.coefficient || 1),
                0
              ) || 0}
            </td>
            <td colSpan={4} className={`border border-black p-1 text-center ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
              {totals1er.totalPoints || "-"}
            </td>
            <td colSpan={4} className={`border border-black p-1 text-center ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
              {totals2eme.totalPoints || "-"}
            </td>
            <td colSpan={4} className={`border border-black p-1 text-center ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
              {totals3eme.totalPoints || "-"}
            </td>
          </tr>

          <tr>
            <td className="border border-black p-1 text-left font-semibold">
              Moyenne & Rang
            </td>
            {/* 1er Trimestre */}
            <td colSpan={3} className={`border border-black p-1 text-center ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
              {(() => {
                const cycle = bulletin?.cycles?.[0];
                const moyenne = cycle?.moyenne;
                return moyenne && moyenne > 0
                  ? `${moyenne.toFixed(2)} / 20`
                  : (totals1er.totalPoints > 0
                    ? `${totals1er.average.toFixed(2)} / 20`
                    : "-");
              })()}
            </td>
            <td className={`border border-black p-1 text-center text-xs ${highlightedTrimester === 0 ? 'bg-red-100' : ''}`}>
              Rank :{(() => {
                const rank = ranks[0];
                return rank !== null && rank !== undefined && rank > 0
                  ? formatRank(rank)
                  : "-";
              })()}
            </td>
            {/* 2ème Trimestre */}
            <td colSpan={3} className={`border border-black p-1 text-center ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
              {(() => {
                const cycle = bulletin?.cycles?.[1];
                const moyenne = cycle?.moyenne;
                return moyenne && moyenne > 0
                  ? `${moyenne.toFixed(2)} / 20`
                  : (totals2eme.totalPoints > 0
                    ? `${totals2eme.average.toFixed(2)} / 20`
                    : "-");
              })()}
            </td>
            <td className={`border border-black p-1 text-center text-xs ${highlightedTrimester === 1 ? 'bg-green-100' : ''}`}>
              Rank :{(() => {
                const rank = ranks[1];
                return rank !== null && rank !== undefined && rank > 0
                  ? formatRank(rank)
                  : "-";
              })()}
            </td>
            {/* 3ème Trimestre */}
            <td colSpan={3} className={`border border-black p-1 text-center ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
              {(() => {
                const cycle = bulletin?.cycles?.[2];
                const moyenne = cycle?.moyenne;
                return moyenne && moyenne > 0
                  ? `${moyenne.toFixed(2)} / 20`
                  : (totals3eme.totalPoints > 0
                    ? `${totals3eme.average.toFixed(2)} / 20`
                    : "-");
              })()}
            </td>
            <td className={`border border-black p-1 text-center text-xs ${highlightedTrimester === 2 ? 'bg-blue-100' : ''}`}>
              Rank :{(() => {
                const rank = ranks[2];
                return rank !== null && rank !== undefined && rank > 0
                  ? formatRank(rank)
                  : "-";
              })()}
            </td>
            {/* Moyen Annuel */}
            <td className={`border border-black p-1 text-center`}>
             Moyenne annuelle :  {moyenneAnnuelle > 0 ? moyenneAnnuelle.toFixed(2) : "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* MOYENNES ANNUELLES */}
      {/* <div className="grid grid-cols-2 gap-2 text-[11px] mt-4 border border-black p-2 font-serif">
        <div>
          <p>
            <strong>Moyenne {trimestre}:</strong> {totals.average}
          </p>
          <p>
            <strong>Rang {trimestre}:</strong> {bulletin.trimester?.id || "N/A"}
          </p>
          <p>
            <strong>Mention:</strong>{" "}
            {totals.average >= 16
              ? "Très Bien"
              : totals.average >= 14
              ? "Bien"
              : totals.average >= 12
              ? "Assez Bien"
              : totals.average >= 10
              ? "Passable"
              : "Insuffisant"}
          </p>
        </div>
        <div>
          <p>
            <strong>Heures d'absence non justifiées:</strong> 0H
          </p>
          <p>
            <strong>Moyenne du 1er:</strong> {totals.average}
          </p>
          <p>
            <strong>Moyenne du dernier:</strong>{" "}
            {totals.average - 2}
          </p>
          <p>
            <strong>Moyenne de la classe:</strong>{" "}
            {totals.average - 1}
          </p>
        </div>
      </div> */}

      {/* SIGNATURES */}
      <div className="mt-4 text-[11px] border border-black p-2 font-serif">
        <div className="flex justify-between mb-3">
          <p>
            <strong>Appréciation du conseil de classe:</strong>
          </p>
          <p>
            <strong>Signature des parents:</strong>
          </p>
        </div>
        <div className="text-right">
          <p>Fait à Bamako le {new Date().toLocaleDateString("fr-FR")}</p>
          <p className="font-semibold">Le Directeur de l'école</p>
          <p>{etudiant?.ecole.directeur}</p>
        </div>
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
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600">Type</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    readOnly
                    value={formData.type}
                  />
                </div>
                <div>
                  <label className="block text-gray-600">Trimestre</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    readOnly
                    value={(() => {
                      const trimesterIndex = formData.trimesterIndex ?? 0;
                      const trimesterNames = ["1er", "2ème", "3ème"];
                      if (trimesterIndex >= 0 && trimesterIndex < trimesterNames.length) {
                        return trimesterNames[trimesterIndex];
                      }
                      return "";
                    })()}
                  />
                </div>
                <div>
                  <label className="block text-gray-600">Matière</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    readOnly
                    value={classe?.matieres?.find(m => m.id === formData.matiere_id)?.nom || ""}
                  />
                </div>
                <div>
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
                <label className="block text-gray-600">
                  Note {formData.type === "composition" ? "(Max 40)" : "(Max 20)"}
                </label>
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
                      // The submit button will handle the submission
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
                          const val = formData.type === "composition" ? "40" : "20";
                          setNoteValue(val);
                          setFormData({ ...formData, note: parseFloat(val) });
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
                          await GradeService.deleteGradeH(String(formData.id));
                          console.log("GradeH deleted successfully");
                          
                          // Store formData values before async operations
                          const cycleId = formData.cycle_id;
                          const trimesterIndex = formData.trimesterIndex;
                          
                          // Refresh the bulletin data first to get updated grades
                          if (onRefresh) {
                            await onRefresh();
                          }
                          
                          // Close the form after refresh
                          setShowForm(false);
                          setNoteValue("");
                          setShowKeyboard(false);
                          
                          // Recalculate and update moyenne if needed
                          
                          if (cycleId && trimesterIndex !== undefined) {
                            // Wait a bit for state to update
                            setTimeout(async () => {
                              try {
                                const totals = calculateTotalsForTrimester(trimesterIndex);
                                if (totals.average > 0 && cycleId) {
                                  await MoyenneService.addMoyenne({
                                    value: totals.average,
                                    cycle_id: cycleId,
                                  });
                                  console.log("Moyenne recalculated after deletion:", totals.average);
                                  
                                  // Refresh the bulletin again
                                  if (onRefresh) {
                                    onRefresh();
                                  }
                                  
                                  // Refresh ranks
                                  setTimeout(async () => {
                                    setIsLoadingRanks(true);
                                    try {
                                      const response = await MoyenneService.getAllByClasseId(classeT || 0);
                                      if (response && response.cycles && Array.isArray(response.cycles) && etudiant?.id) {
                                        const cycleData = response.cycles.find((cycle: CycleData) => 
                                          cycle.cycle_position - 1 === trimesterIndex
                                        );
                                        
                                        if (cycleData && cycleData.entries && Array.isArray(cycleData.entries)) {
                                          const studentEntry = cycleData.entries.find((entry: MoyenneEntry) => 
                                            String(entry.eleve_id) === String(etudiant.id)
                                          );
                                          
                                          if (studentEntry && studentEntry.rank != null) {
                                            setRanks(prev => ({ ...prev, [trimesterIndex]: studentEntry.rank }));
                                          }
                                        }
                                      }
                                    } catch (error) {
                                      console.error("Error refreshing rank:", error);
                                    } finally {
                                      setIsLoadingRanks(false);
                                    }
                                  }, 300);
                                }
                              } catch (error) {
                                console.error("Error recalculating moyenne:", error);
                              }
                            }, 300);
                          }
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
                        type: formData.type,
                        date: formData.date,
                        cycle_id: formData.cycle_id,
                        matiere_id: parseInt(formData.matiere_id || "0"),
                        ...(formData.id && { id: formData.id }),
                      };
                      console.log("Grade to submit:", payload);
                      await GradeService.addGrade(payload);
                      console.log("Grade saved successfully");
                      
                      // Store formData values before async operations
                      const cycleId = formData.cycle_id;
                      const trimesterIndex = formData.trimesterIndex;
                      
                      // Close the form immediately before loading operations
                      setShowForm(false);
                      setNoteValue("");
                      setShowKeyboard(false);
                      
                      // Fetch the fresh bulletin data directly to ensure we have the latest grades
                      let freshBulletin: Bulletin | null = null;
                      if (etudiant?.id && classeT) {
                        try {
                          freshBulletin = await BulletinService.getByEleveAndClasse(
                            String(etudiant.id),
                            String(classeT)
                          );
                          console.log("Fetched fresh bulletin after grade save:", freshBulletin);
                        } catch (error) {
                          console.error("Error fetching fresh bulletin:", error);
                        }
                      }
                      
                      // Now that we have the fresh bulletin with the new grade, calculate and save moyenne
                      if (cycleId && trimesterIndex !== undefined && freshBulletin) {
                        try {
                          // Recalculate the moyenne for this specific trimester using the fresh bulletin data
                          const totals = calculateTotalsForTrimesterFromBulletin(freshBulletin, trimesterIndex);
                          console.log(`Calculated totals for trimester ${trimesterIndex + 1}:`, totals);
                          
                          if (totals.average > 0 && cycleId) {
                            try {
                              await MoyenneService.addMoyenne({
                                value: totals.average,
                                cycle_id: cycleId,
                              });
                              console.log(`Moyenne calculated and saved for trimester ${trimesterIndex + 1}:`, totals.average);
                              
                              // Refresh the bulletin in the parent component to get updated rank and moyenne from API
                              if (onRefresh) {
                                await onRefresh();
                              }
                              
                              // Refresh ranks after moyenne is saved
                              setIsLoadingRanks(true);
                              try {
                                const response = await MoyenneService.getAllByClasseId(classeT || 0);
                                if (response && response.cycles && Array.isArray(response.cycles) && etudiant?.id) {
                                  // Find the cycle for this trimester index
                                  const cycleData = response.cycles.find((cycle: CycleData) => 
                                    cycle.cycle_position - 1 === trimesterIndex
                                  );
                                  
                                  if (cycleData && cycleData.entries && Array.isArray(cycleData.entries)) {
                                    // Find current student's entry
                                    const studentEntry = cycleData.entries.find((entry: MoyenneEntry) => 
                                      String(entry.eleve_id) === String(etudiant.id)
                                    );
                                    
                                    // Use the rank directly from the API response
                                    if (studentEntry && studentEntry.rank != null) {
                                      setRanks(prev => ({ ...prev, [trimesterIndex]: studentEntry.rank }));
                                    }
                                  }
                                }
                              } catch (error) {
                                console.error("Error refreshing rank:", error);
                              } finally {
                                setIsLoadingRanks(false);
                              }
                            } catch (error) {
                              console.error("Error calculating/saving moyenne:", error);
                            }
                          }
                        } catch (error) {
                          console.error("Error calculating totals:", error);
                        }
                      } else if (onRefresh) {
                        // If we couldn't fetch fresh bulletin, still refresh to update the UI
                        await onRefresh();
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

export default BulletinSecondTrimester;
