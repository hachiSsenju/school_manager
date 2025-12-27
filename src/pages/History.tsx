import { useEffect, useState } from 'react';
import { History as HistoryIcon, GraduationCap, School, Users, BookOpen, ChevronDown, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { HistoryServices } from '../services/histotyService';
import { SessionServices } from '../services/sessionServices';

interface HistoryRecord {
    id: number;
    value: any;
    prevValue: any;
    entity: string;
    action: 'create' | 'delete' | 'transfert' | 'update' | 'active';
    ecole: string;
    utilisateur: string;
    date: string;
}

type ActiveSection = 'eleves' | 'classes' | 'professeurs' | 'matieres';

const getActionLabel = (action: string): string => {
    const actionMap: { [key: string]: string } = {
        'create': 'Création',
        'delete': 'Suppression',
        'transfert': 'Transfert',
        'update': 'Modification',
        'active': 'Activation/Désactivation',
    };
    return actionMap[action] || action;
};

const getActionColor = (action: string): string => {
    const colorMap: { [key: string]: string } = {
        'create': 'bg-green-100 text-green-800',
        'delete': 'bg-red-100 text-red-800',
        'transfert': 'bg-blue-100 text-blue-800',
        'update': 'bg-yellow-100 text-yellow-800',
        'active': 'bg-orange-100 text-orange-800',
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800';
};

export default function History() {
    const [activeSection, setActiveSection] = useState<ActiveSection>('eleves');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // Filters and sorting for Élèves section
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterClasse, setFilterClasse] = useState<string>('');
    const [filterStudent, setFilterStudent] = useState<string>('');
    const [filterAction, setFilterAction] = useState<string>('');

    // Filters and sorting for Classes section
    const [classeSortBy, setClasseSortBy] = useState<'date' | 'name'>('date');
    const [classeSortOrder, setClasseSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterNiveau, setFilterNiveau] = useState<string>('');
    const [filterClasseName, setFilterClasseName] = useState<string>('');
    const [filterClasseAction, setFilterClasseAction] = useState<string>('');

    // Filters and sorting for Professeurs section
    const [profSortBy, setProfSortBy] = useState<'date' | 'name'>('date');
    const [profSortOrder, setProfSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterProfName, setFilterProfName] = useState<string>('');
    const [filterProfAction, setFilterProfAction] = useState<string>('');

    // Filters and sorting for Matières section
    const [matiereSortBy, setMatiereSortBy] = useState<'date' | 'name'>('date');
    const [matiereSortOrder, setMatiereSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterMatiereName, setFilterMatiereName] = useState<string>('');
    const [filterMatiereAction, setFilterMatiereAction] = useState<string>('');

    useEffect(() => {
        const fetchHistoryData = async () => {
            try {
                setLoading(true);
                const schoolId = SessionServices.getSchoolId();
                const data = await HistoryServices.getAllByEcoleId(schoolId);
                setHistoryRecords(data || []);
            } catch (err) {
                console.error('Erreur lors du chargement de l\'historique:', err);
                setError('Impossible de charger les données historiques.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistoryData();
    }, []);

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const toggleRowExpansion = (recordId: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(recordId)) {
            newExpanded.delete(recordId);
        } else {
            newExpanded.add(recordId);
        }
        setExpandedRows(newExpanded);
    };

    // Filter records by entity type
    const getFilteredRecords = (entityType: string) => {
        return historyRecords.filter(record =>
            record.entity.toLowerCase() === entityType.toLowerCase()
        );
    };

    const eleveRecords = getFilteredRecords('Eleve');
    const classeRecords = getFilteredRecords('Classe');
    const profRecords = getFilteredRecords('Professeur');
    // const paymentRecords = getFilteredRecords('Payment');
    const matiereRecords = getFilteredRecords('Matiere');

    // Get unique classes and actions for filters
    const uniqueClasses = Array.from(new Set(
        eleveRecords
            .map(r => (r.value?.classe || r.prevValue?.classe))
            .filter(Boolean)
    )).sort();

    const uniqueActions = Array.from(new Set(
        eleveRecords.map(r => r.action)
    )).sort();

    // Filter and sort élèves records
    const getFilteredAndSortedEleveRecords = () => {
        let filtered = [...eleveRecords];

        // Apply filters
        if (filterClasse) {
            filtered = filtered.filter(record => {
                const classe = record.value?.classe || record.prevValue?.classe;
                return classe === filterClasse;
            });
        }

        if (filterStudent) {
            filtered = filtered.filter(record => {
                const studentData = record.value || record.prevValue;
                const fullName = `${studentData?.nom} ${studentData?.prenom}`.toLowerCase();
                return fullName.includes(filterStudent.toLowerCase());
            });
        }

        if (filterAction) {
            filtered = filtered.filter(record => record.action === filterAction);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const nameA = `${(a.value || a.prevValue)?.nom} ${(a.value || a.prevValue)?.prenom}`.toLowerCase();
                const nameB = `${(b.value || b.prevValue)?.nom} ${(b.value || b.prevValue)?.prenom}`.toLowerCase();
                if (sortOrder === 'asc') {
                    return nameA.localeCompare(nameB);
                } else {
                    return nameB.localeCompare(nameA);
                }
            }
        });

        return filtered;
    };

    const filteredEleveRecords = getFilteredAndSortedEleveRecords();

    // Get unique niveaux and actions for Classes filters
    const uniqueNiveaux = Array.from(new Set(
        classeRecords
            .map(r => (r.value?.niveau || r.prevValue?.niveau))
            .filter(Boolean)
    )).sort();

    const uniqueClasseActions = Array.from(new Set(
        classeRecords.map(r => r.action)
    )).sort();

    // Filter and sort classes records
    const getFilteredAndSortedClasseRecords = () => {
        let filtered = [...classeRecords];

        // Apply filters
        if (filterNiveau) {
            filtered = filtered.filter(record => {
                const niveau = record.value?.niveau || record.prevValue?.niveau;
                return niveau === filterNiveau;
            });
        }

        if (filterClasseName) {
            filtered = filtered.filter(record => {
                const classeData = record.value || record.prevValue;
                const nom = classeData?.nom?.toLowerCase() || '';
                return nom.includes(filterClasseName.toLowerCase());
            });
        }

        if (filterClasseAction) {
            filtered = filtered.filter(record => record.action === filterClasseAction);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (classeSortBy === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return classeSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const nameA = ((a.value || a.prevValue)?.nom || '').toLowerCase();
                const nameB = ((b.value || b.prevValue)?.nom || '').toLowerCase();
                if (classeSortOrder === 'asc') {
                    return nameA.localeCompare(nameB);
                } else {
                    return nameB.localeCompare(nameA);
                }
            }
        });

        return filtered;
    };

    const filteredClasseRecords = getFilteredAndSortedClasseRecords();

    // Get unique actions for Professeurs filters
    const uniqueProfActions = Array.from(new Set(
        profRecords.map(r => r.action)
    )).sort();

    // Filter and sort professeurs records
    const getFilteredAndSortedProfRecords = () => {
        let filtered = [...profRecords];

        // Apply filters
        if (filterProfName) {
            filtered = filtered.filter(record => {
                const profData = record.value || record.prevValue;
                const fullName = `${profData?.nom} ${profData?.prenom}`.toLowerCase();
                return fullName.includes(filterProfName.toLowerCase());
            });
        }

        if (filterProfAction) {
            filtered = filtered.filter(record => record.action === filterProfAction);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (profSortBy === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return profSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const nameA = `${(a.value || a.prevValue)?.nom} ${(a.value || a.prevValue)?.prenom}`.toLowerCase();
                const nameB = `${(b.value || b.prevValue)?.nom} ${(b.value || b.prevValue)?.prenom}`.toLowerCase();
                if (profSortOrder === 'asc') {
                    return nameA.localeCompare(nameB);
                } else {
                    return nameB.localeCompare(nameA);
                }
            }
        });

        return filtered;
    };

    const filteredProfRecords = getFilteredAndSortedProfRecords();

    // Get unique actions for Matières filters
    const uniqueMatiereActions = Array.from(new Set(
        matiereRecords.map(r => r.action)
    )).sort();

    // Filter and sort matières records
    const getFilteredAndSortedMatiereRecords = () => {
        let filtered = [...matiereRecords];

        // Apply filters
        if (filterMatiereName) {
            filtered = filtered.filter(record => {
                const matiereData = record.value || record.prevValue;
                const nom = matiereData?.nom?.toLowerCase() || '';
                return nom.includes(filterMatiereName.toLowerCase());
            });
        }

        if (filterMatiereAction) {
            filtered = filtered.filter(record => record.action === filterMatiereAction);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (matiereSortBy === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return matiereSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const nameA = ((a.value || a.prevValue)?.nom || '').toLowerCase();
                const nameB = ((b.value || b.prevValue)?.nom || '').toLowerCase();
                if (matiereSortOrder === 'asc') {
                    return nameA.localeCompare(nameB);
                } else {
                    return nameB.localeCompare(nameA);
                }
            }
        });

        return filtered;
    };

    const filteredMatiereRecords = getFilteredAndSortedMatiereRecords();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <HistoryIcon size={32} className="text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg border">
                <div className="flex border-b overflow-x-auto">
                    {[
                        { key: 'eleves', label: 'Élèves', icon: GraduationCap, count: eleveRecords.length },
                        { key: 'classes', label: 'Classes', icon: School, count: classeRecords.length },
                        { key: 'professeurs', label: 'Professeurs', icon: Users, count: profRecords.length },
                        { key: 'matieres', label: 'Matières', icon: BookOpen, count: matiereRecords.length },
                    ].map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key as ActiveSection)}
                            className={`flex items-center px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeSection === key
                                ? 'border-blue-600 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Icon size={18} className="mr-2" />
                            {label} ({count})
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Section Élèves */}
                    {activeSection === 'eleves' && (
                        <div className="space-y-4">
                            {/* Filters and Sorting */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={18} className="text-gray-600" />
                                    <h3 className="font-medium text-gray-900">Filtres et tri</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Trier par
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="date">Date</option>
                                            <option value="name">Nom</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Ordre
                                        </label>
                                        <button
                                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpDown size={16} />
                                            {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                                        </button>
                                    </div>

                                    {/* Filter by Classe */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Classe
                                        </label>
                                        <select
                                            value={filterClasse}
                                            onChange={(e) => setFilterClasse(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Toutes les classes</option>
                                            {uniqueClasses.map(classe => (
                                                <option key={classe} value={classe}>{classe}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Filter by Action */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Action
                                        </label>
                                        <select
                                            value={filterAction}
                                            onChange={(e) => setFilterAction(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Toutes les actions</option>
                                            {uniqueActions.map(action => (
                                                <option key={action} value={action}>{getActionLabel(action)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search by Student Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Rechercher élève
                                        </label>
                                        <input
                                            type="text"
                                            value={filterStudent}
                                            onChange={(e) => setFilterStudent(e.target.value)}
                                            placeholder="Nom ou prénom..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(filterClasse || filterStudent || filterAction) && (
                                    <button
                                        onClick={() => {
                                            setFilterClasse('');
                                            setFilterStudent('');
                                            setFilterAction('');
                                        }}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>

                            {/* Results Count */}
                            <div className="text-sm text-gray-600">
                                {filteredEleveRecords.length} résultat{filteredEleveRecords.length > 1 ? 's' : ''} sur {eleveRecords.length}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nom complet
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Classe
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Utilisateur
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredEleveRecords.length > 0 ? (
                                            filteredEleveRecords.map((record) => {
                                                const studentData = record.value || record.prevValue;
                                                const isExpanded = expandedRows.has(record.id);
                                                return (
                                                    <>
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => toggleRowExpansion(record.id)}
                                                                    className="text-gray-400 hover:text-gray-600"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(record.date)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(record.action)}`}>
                                                                    {getActionLabel(record.action)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {record.action === 'active' ? (
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.value?.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {record.value?.status ? 'true' : 'false'}
                                                                        </span>
                                                                    ) : (
                                                                        `${studentData?.nom} ${studentData?.prenom}`
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {studentData?.classe || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {record.utilisateur}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan={6} className="px-6 py-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {record.prevValue && (
                                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-red-800 mb-2">Valeur précédente</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    {record.action == 'active' ? (
                                                                                        <div><dt className="inline font-medium">Status:</dt> <dd className="inline">{record.prevValue?.status ? 'true' : 'false'}</dd></div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.prevValue.nom}</dd></div>
                                                                                            <div><dt className="inline font-medium">Prénom:</dt> <dd className="inline">{record.prevValue.prenom}</dd></div>
                                                                                            <div><dt className="inline font-medium">Date de naissance:</dt> <dd className="inline">{record.prevValue.birthday}</dd></div>
                                                                                            {record.prevValue.sexe && <div><dt className="inline font-medium">Sexe:</dt> <dd className="inline">{record.prevValue.sexe}</dd></div>}
                                                                                            {record.prevValue.birthplace && <div><dt className="inline font-medium">Lieu de naissance:</dt> <dd className="inline">{record.prevValue.birthplace}</dd></div>}
                                                                                            {record.prevValue.matricule && <div><dt className="inline font-medium">Matricule:</dt> <dd className="inline">{record.prevValue.matricule}</dd></div>}
                                                                                            <div><dt className="inline font-medium">Classe:</dt> <dd className="inline">{record.prevValue.classe || 'N/A'}</dd></div>
                                                                                            {record.prevValue.email_parent && <div><dt className="inline font-medium">Email parent:</dt> <dd className="inline">{record.prevValue.email_parent}</dd></div>}
                                                                                        </>
                                                                                    )}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                        {record.value && (
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-green-800 mb-2">Valeur actuelle</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    {record.action === 'active' ? (
                                                                                        <div><dt className="inline font-medium">Status:</dt> <dd className="inline">{record.value?.status ? 'true' : 'false'}</dd></div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.value.nom}</dd></div>
                                                                                            <div><dt className="inline font-medium">Prénom:</dt> <dd className="inline">{record.value.prenom}</dd></div>
                                                                                            <div><dt className="inline font-medium">Date de naissance:</dt> <dd className="inline">{record.value.birthday}</dd></div>
                                                                                            {record.value.sexe && <div><dt className="inline font-medium">Sexe:</dt> <dd className="inline">{record.value.sexe}</dd></div>}
                                                                                            {record.value.birthplace && <div><dt className="inline font-medium">Lieu de naissance:</dt> <dd className="inline">{record.value.birthplace}</dd></div>}
                                                                                            {record.value.matricule && <div><dt className="inline font-medium">Matricule:</dt> <dd className="inline">{record.value.matricule}</dd></div>}
                                                                                            <div><dt className="inline font-medium">Classe:</dt> <dd className="inline">{record.value.classe || 'N/A'}</dd></div>
                                                                                            {record.value.email_parent && <div><dt className="inline font-medium">Email parent:</dt> <dd className="inline">{record.value.email_parent}</dd></div>}
                                                                                            {record.value.nom_ecole && <div><dt className="inline font-medium">École:</dt> <dd className="inline">{record.value.nom_ecole}</dd></div>}
                                                                                        </>
                                                                                    )}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Aucun résultat trouvé
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Section Classes */}
                    {activeSection === 'classes' && (
                        <div className="space-y-4">
                            {/* Filters and Sorting */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={18} className="text-gray-600" />
                                    <h3 className="font-medium text-gray-900">Filtres et tri</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Trier par
                                        </label>
                                        <select
                                            value={classeSortBy}
                                            onChange={(e) => setClasseSortBy(e.target.value as 'date' | 'name')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="date">Date</option>
                                            <option value="name">Nom</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Ordre
                                        </label>
                                        <button
                                            onClick={() => setClasseSortOrder(classeSortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpDown size={16} />
                                            {classeSortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                                        </button>
                                    </div>

                                    {/* Filter by Niveau */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Niveau
                                        </label>
                                        <select
                                            value={filterNiveau}
                                            onChange={(e) => setFilterNiveau(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Tous les niveaux</option>
                                            {uniqueNiveaux.map(niveau => (
                                                <option key={niveau} value={niveau}>{niveau}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Filter by Action */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Action
                                        </label>
                                        <select
                                            value={filterClasseAction}
                                            onChange={(e) => setFilterClasseAction(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Toutes les actions</option>
                                            {uniqueClasseActions.map(action => (
                                                <option key={action} value={action}>{getActionLabel(action)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search by Class Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Rechercher classe
                                        </label>
                                        <input
                                            type="text"
                                            value={filterClasseName}
                                            onChange={(e) => setFilterClasseName(e.target.value)}
                                            placeholder="Nom de la classe..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(filterNiveau || filterClasseName || filterClasseAction) && (
                                    <button
                                        onClick={() => {
                                            setFilterNiveau('');
                                            setFilterClasseName('');
                                            setFilterClasseAction('');
                                        }}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>

                            {/* Results Count */}
                            <div className="text-sm text-gray-600">
                                {filteredClasseRecords.length} résultat{filteredClasseRecords.length > 1 ? 's' : ''} sur {classeRecords.length}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nom
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Niveau
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Utilisateur
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredClasseRecords.length > 0 ? (
                                            filteredClasseRecords.map((record) => {
                                                const classeData = record.value || record.prevValue;
                                                const isExpanded = expandedRows.has(record.id);
                                                return (
                                                    <>
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => toggleRowExpansion(record.id)}
                                                                    className="text-gray-400 hover:text-gray-600"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(record.date)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(record.action)}`}>
                                                                    {getActionLabel(record.action)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {classeData?.nom}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {classeData?.niveau || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {record.utilisateur}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan={6} className="px-6 py-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {record.prevValue && (
                                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-red-800 mb-2">Valeur précédente</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.prevValue.nom}</dd></div>
                                                                                    <div><dt className="inline font-medium">Niveau:</dt> <dd className="inline">{record.prevValue.niveau}</dd></div>
                                                                                    {record.prevValue.frais && <div><dt className="inline font-medium">Frais:</dt> <dd className="inline">{record.prevValue.frais} FCFA</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                        {record.value && (
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-green-800 mb-2">Valeur actuelle</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.value.nom}</dd></div>
                                                                                    <div><dt className="inline font-medium">Niveau:</dt> <dd className="inline">{record.value.niveau}</dd></div>
                                                                                    {record.value.frais && <div><dt className="inline font-medium">Frais:</dt> <dd className="inline">{record.value.frais} FCFA</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Aucun résultat trouvé
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Section Professeurs */}
                    {activeSection === 'professeurs' && (
                        <div className="space-y-4">
                            {/* Filters and Sorting */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={18} className="text-gray-600" />
                                    <h3 className="font-medium text-gray-900">Filtres et tri</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Trier par
                                        </label>
                                        <select
                                            value={profSortBy}
                                            onChange={(e) => setProfSortBy(e.target.value as 'date' | 'name')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="date">Date</option>
                                            <option value="name">Nom</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Ordre
                                        </label>
                                        <button
                                            onClick={() => setProfSortOrder(profSortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpDown size={16} />
                                            {profSortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                                        </button>
                                    </div>

                                    {/* Filter by Action */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Action
                                        </label>
                                        <select
                                            value={filterProfAction}
                                            onChange={(e) => setFilterProfAction(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Toutes les actions</option>
                                            {uniqueProfActions.map(action => (
                                                <option key={action} value={action}>{getActionLabel(action)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search by Professor Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Rechercher professeur
                                        </label>
                                        <input
                                            type="text"
                                            value={filterProfName}
                                            onChange={(e) => setFilterProfName(e.target.value)}
                                            placeholder="Nom ou prénom..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(filterProfName || filterProfAction) && (
                                    <button
                                        onClick={() => {
                                            setFilterProfName('');
                                            setFilterProfAction('');
                                        }}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>

                            {/* Results Count */}
                            <div className="text-sm text-gray-600">
                                {filteredProfRecords.length} résultat{filteredProfRecords.length > 1 ? 's' : ''} sur {profRecords.length}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nom complet
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Téléphone
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Utilisateur
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredProfRecords.length > 0 ? (
                                            filteredProfRecords.map((record) => {
                                                const profData = record.value || record.prevValue;
                                                const isExpanded = expandedRows.has(record.id);
                                                return (
                                                    <>
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => toggleRowExpansion(record.id)}
                                                                    className="text-gray-400 hover:text-gray-600"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(record.date)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(record.action)}`}>
                                                                    {getActionLabel(record.action)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {profData?.nom} {profData?.prenom}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {profData?.telephone || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {record.utilisateur}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan={6} className="px-6 py-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {record.prevValue && (
                                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-red-800 mb-2">Valeur précédente</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.prevValue.nom}</dd></div>
                                                                                    <div><dt className="inline font-medium">Prénom:</dt> <dd className="inline">{record.prevValue.prenom}</dd></div>
                                                                                    {record.prevValue.telephone && <div><dt className="inline font-medium">Téléphone:</dt> <dd className="inline">{record.prevValue.telephone}</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                        {record.value && (
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-green-800 mb-2">Valeur actuelle</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.value.nom}</dd></div>
                                                                                    <div><dt className="inline font-medium">Prénom:</dt> <dd className="inline">{record.value.prenom}</dd></div>
                                                                                    {record.value.telephone && <div><dt className="inline font-medium">Téléphone:</dt> <dd className="inline">{record.value.telephone}</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Aucun résultat trouvé
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Section Matières */}
                    {activeSection === 'matieres' && (
                        <div className="space-y-4">
                            {/* Filters and Sorting */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={18} className="text-gray-600" />
                                    <h3 className="font-medium text-gray-900">Filtres et tri</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Trier par
                                        </label>
                                        <select
                                            value={matiereSortBy}
                                            onChange={(e) => setMatiereSortBy(e.target.value as 'date' | 'name')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="date">Date</option>
                                            <option value="name">Nom</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Ordre
                                        </label>
                                        <button
                                            onClick={() => setMatiereSortOrder(matiereSortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpDown size={16} />
                                            {matiereSortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                                        </button>
                                    </div>

                                    {/* Filter by Action */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Action
                                        </label>
                                        <select
                                            value={filterMatiereAction}
                                            onChange={(e) => setFilterMatiereAction(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Toutes les actions</option>
                                            {uniqueMatiereActions.map(action => (
                                                <option key={action} value={action}>{getActionLabel(action)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search by Matière Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Rechercher matière
                                        </label>
                                        <input
                                            type="text"
                                            value={filterMatiereName}
                                            onChange={(e) => setFilterMatiereName(e.target.value)}
                                            placeholder="Nom de la matière..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(filterMatiereName || filterMatiereAction) && (
                                    <button
                                        onClick={() => {
                                            setFilterMatiereName('');
                                            setFilterMatiereAction('');
                                        }}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>

                            {/* Results Count */}
                            <div className="text-sm text-gray-600">
                                {filteredMatiereRecords.length} résultat{filteredMatiereRecords.length > 1 ? 's' : ''} sur {matiereRecords.length}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nom
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Coefficient
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Utilisateur
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredMatiereRecords.length > 0 ? (
                                            filteredMatiereRecords.map((record) => {
                                                const matiereData = record.value || record.prevValue;
                                                const isExpanded = expandedRows.has(record.id);
                                                return (
                                                    <>
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => toggleRowExpansion(record.id)}
                                                                    className="text-gray-400 hover:text-gray-600"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(record.date)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(record.action)}`}>
                                                                    {getActionLabel(record.action)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {matiereData?.nom}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {matiereData?.coefficient || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {record.utilisateur}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan={6} className="px-6 py-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {record.prevValue && (
                                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-red-800 mb-2">Valeur précédente</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.prevValue.nom}</dd></div>
                                                                                    {record.prevValue.coefficient && <div><dt className="inline font-medium">Coefficient:</dt> <dd className="inline">{record.prevValue.coefficient}</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                        {record.value && (
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                                <h4 className="font-semibold text-green-800 mb-2">Valeur actuelle</h4>
                                                                                <dl className="space-y-1 text-sm">
                                                                                    <div><dt className="inline font-medium">Nom:</dt> <dd className="inline">{record.value.nom}</dd></div>
                                                                                    {record.value.coefficient && <div><dt className="inline font-medium">Coefficient:</dt> <dd className="inline">{record.value.coefficient}</dd></div>}
                                                                                </dl>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Aucun résultat trouvé
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
