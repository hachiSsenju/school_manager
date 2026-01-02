

export interface Payment {
  id: number | string;
  somme: number;
  description: string;
  type: string;
  motif: string;
  date: string;
  eleve?: {
    id: number | string;
    nom: string;
    prenom?: string;
  };
  classe?: {
    id: number | string;
    nom: string;
  };
  user?: {
    id: number | string;
    nom: string;
    prenom?: string;
  };
  prof?: {
    id: number | string;
    nom: string;
    prenom?: string;
  } | null;
  ecole?: {
    id: number | string;
    nom: string;
  };
}

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  birthday: string;
  adesion: string;
  solde_initial: number;
  grades: Grade[];
  classe: Classe;
  bulletins: Bulletin[];
  matricule: String;
  sexe: string;
  birthplace: string;
  ecole : Ecole;
  email_parent : string;
  payments?: Payment[];
  // comments: Comment[];
}

export interface Bulletin {
  id: string;
  eleve: Student;
  classe: Classe | string;
  trimester?: Trimester;
  grades?: Grade[];
  cycles?: Cycle[];
  mois?: Mois[];
}
export interface Cycle {
  id : string,
  libelle : string,
  rank?: number | null,
  moyenne?: number | null,
  gradeH : GradeH[],
}
export interface GradeH {
  id : string,
  matiere : Matiere,
  cycle : Cycle,
  note : number,
  type: string,
  date : string,
}
export interface Trimester {
  id: string;
  nom: string;
  classe: Classe;
  bulletins: Bulletin[];
  grades: Grade[];
}

export interface Classe {
  id: string;
  nom: string;
  niveau: string;
  frais: number;
  nbMax: number;
  matieres: Matiere[];
  eleves: Student[];
  trimester: Trimester[];
  responsables?: Prof[];
}

export interface Matiere {
  id: string;
  nom: string;
  coefficient: number;
  professeur_id: string;
  classe_id: string;
  grades: Grade[];
  classe: Classe;
}

export interface Grade {
  id: string;
  student_id: string;
  matiere_id: string;
  matiere: Matiere;
  note: number;
  note_maximal: number;
  type_examen: "composition" | "devoir" | "interrogation";
  trimestre: 1 | 2 | 3;
  date: string;
}

// export interface Payment {
//   id: string;
//   studentId: string;
//   amount: number;
//   type: "inscription" | "mensualite" | "trimestre" | "autre";
//   description: string;
//   date: string;
//   method: "cash" | "bank" | "mobile";
// }

// export interface Parent {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   phone: string;
//   address: string;
//   children: string[];
// }

// export interface Comment {
//   id: string;
//   studentId: string;
//   authorId: string;
//   authorType: "admin" | "teacher" | "parent";
//   content: string;
//   type: "behavior" | "performance" | "general";
//   date: string;
//   isPrivate: boolean;
// }

export interface School {
  id: string;
  name: string;
  address: string;
  totalStudents: number;
  totalRevenue: number;
  classes: Classe[];
}

// export interface CashEntry {
//   id: string;
//   date: string;
//   type: "income" | "expense";
//   amount: number;
//   description: string;
//   studentId?: string;
//   category: string;
// }

export interface User {
  id: string;
  email: string;
  roles: string[];
  nom: string;
  prenom: string;
  telephone: string;
  ecoles: Ecole[];
}

export interface Ecole {
  id: string;
  nom: string;
  adresse?: string;
  phone?: string;
  email?: string;
  directeur : string;
  professeurs: Prof[];
  eleves: Student[];
  classes: Classe[];
  trimesters?: Trimester[];
  bulletins?: Bulletin[];
}

export interface Prof {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  matieres: Matiere[];
}

export interface Mois {
  id: string;
  libelle: string;
  rank?: number | null;
  moyenne?: number | null;
  gradeP?: GradeP[];
}

export interface GradeP {
  id: string;
  note: number;
  matiere: {
    id: string;
    coef?: number;
    nom?: string;
  };
  date: string;
}
