import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dropdown from './utils/Dropdown';
import PlanTypePage from './pages/StimulationPlanning/PlanTypeSelection'
import ContactSelection from './pages/StimulationPlanning/ContactSelection'
import FunctionalTestSelection from './pages/StimulationPlanning/FunctionalTestSelection'
import UserDocumentation from './pages/UserDocumentation';
import Debug from './pages/Debug';
import DatabaseTable from "./pages/DatabaseTable";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import { parseCSVFile, Identifiers } from './utils/CSVParser';
import Localization from './pages/Localization';
import Designation from './pages/ContactDesignation/DesignationPage';
import Resection from './pages/ContactDesignation/ResectionPage';
import { FcGoogle } from 'react-icons/fc';
import { ErrorProvider, useError } from './context/ErrorContext';
import { WarningProvider, useWarning } from './context/WarningContext';
import DBLookup from './pages/DatabaseLookup';
import { BrainMapping } from './pages/BrainMappingConfig';

const backendURL = __APP_CONFIG__.backendURL;

// Shared utility to format patient display
const formatPatientDisplay = (patient) => {
    const shortPatientId = patient.patient_id.substring(0, 3).toUpperCase();
    const creationDate = patient.has_localization ? new Date(patient.localization_creation_date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
    }) : 'No files';
    return `Patient ${shortPatientId}-${creationDate}`;
};

const Tab = ({ title, isActive, onClick, onClose, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        if (title !== 'Home') {
            setIsEditing(true);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editedTitle.trim() !== '' && editedTitle !== title) {
            onRename(editedTitle.trim());
        } else {
            setEditedTitle(title);
        }
    };

    return (
        <div 
            className={`flex items-center px-4 py-2 border-b-2 cursor-pointer ${
                isActive ? 'border-sky-700 text-sky-700' : 'border-transparent'
            }`}
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    className="w-32 border rounded px-1 outline-none text-black"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span>{title}</span>
            )}
            {title !== 'Home' && (
                <button 
                    className="ml-2 text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
};

const PatientTabGroup = ({ patientId, tabs, activeTab, onTabClick, onTabClose, onTabRename }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const patientTabs = tabs.filter(tab => tab.state?.patientId === patientId);
    const groupRef = useRef(null);
    
    if (patientTabs.length === 0) return null;

    const handleCloseGroup = (e) => {
        e.stopPropagation();
        onTabClose(patientTabs.map(tab => tab.id));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (groupRef.current && !groupRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Check if any tab in this group is active
    const isGroupActive = patientTabs.some(tab => tab.id === activeTab);

    // Get the first three letters of the patient ID and format the creation date
    const shortPatientId = patientId.substring(0, 3).toUpperCase();
    const creationDate = new Date(patientTabs[0].state.creationDate).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
    });

    return (
        <div className="relative group" ref={groupRef}>
            <div 
                className={`flex items-center px-4 py-2 border-b-2 cursor-pointer hover:bg-gray-50 ${
                    isGroupActive ? 'border-sky-700 text-sky-700' : 'border-transparent'
                }`}
                onClick={() => {
                    if (isGroupActive) {
                        setIsExpanded(!isExpanded);
                    } else {
                        // If clicking on an inactive group, make its first tab active
                        onTabClick(patientTabs[0].id);
                        setIsExpanded(true);
                    }
                }}
            >
                <span className="mr-5 text-gray-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </span>
                <span className="font-semibold">Patient {shortPatientId}-{creationDate}</span>
                
                <button 
                    className="ml-2 text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={handleCloseGroup}
                >
                    ×
                </button>
            </div>
            {isExpanded && isGroupActive && (
                <div className="absolute left-0 top-full z-10 bg-white shadow-lg border border-gray-200 min-w-[200px]">
                    {patientTabs.map(tab => (
                        <div 
                            key={tab.id}
                            className={`flex items-center px-4 py-2 border-b-2 cursor-pointer ${
                                activeTab === tab.id ? 'border-sky-700 text-sky-700' : 'border-transparent'
                            }`}
                            onClick={() => {
                                onTabClick(tab.id);
                                setIsExpanded(false);
                            }}
                            onDoubleClick={() => {
                                if (tab.title !== 'Home') {
                                    const newTitle = prompt('Enter new title:', tab.title);
                                    if (newTitle && newTitle.trim() !== '') {
                                        onTabRename(tab.id, newTitle.trim());
                                    }
                                }
                            }}
                        >
                            <span>{tab.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const UserProfile = ({ onSignOut }) => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const { showWarning } = useWarning();
    
    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            try {
                const response = await fetch(`${backendURL}/api/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user profile');
                }

                const user = await response.json();
                setUserName(user.name);
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };

        fetchUserProfile();
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('tabs');
        localStorage.removeItem('activeTab');
        onSignOut();
        navigate('/');
        window.location.reload();
    };

    return (
        <div className="flex justify-end items-center gap-2 px-2 py-1 border-b bg-gray-50
                        lg:gap-4 lg:px-4 lg:py-2">
            <span className="text-sky-700 font-semibold text-xs lg:text-sm">{userName}</span>
            <button 
                onClick={handleSignOut}
                className="px-2 py-1 text-xs text-red-600 text-sm font-medium
                           transition-colors duration-200 cursor-pointer hover:text-red-800
                           lg:px-4 lg:py-2 lg:text-sm"
            >
                Sign Out
            </button>
        </div>
    );
};

// Shared utility functions for file operations
const FileUtils = {
    // Transform database records into the electrode format used by Localization component
    transformLocalizationData: (dbRecords) => {
        if (!dbRecords || dbRecords.length === 0) {
            console.warn('No data to transform');
            return {};
        }
        
        console.log('Raw database records:', JSON.stringify(dbRecords, null, 2));
        
        const electrodes = {};
        
        console.log('Starting data transformation with record count:', dbRecords.length);
        
        // Group by electrode
        dbRecords.forEach((record, index) => {
            if (!record.electrode) {
                console.warn(`Record ${index} missing electrode data:`, record);
                return;
            }
            
            const electrode = record.electrode;
            const label = electrode.label;
            const description = electrode.description || 'Unknown Electrode';
            const contact = record.contact;
            const regionName = record.region?.name || '';
            const tissueType = record.tissue_type || '';
            
            console.log(`Processing record ${index}: Electrode=${label}, Contact=${contact}, Type=${tissueType}, Region=${regionName}`);
            
            // Initialize electrode if not exists
            if (!electrodes[label]) {
                electrodes[label] = {
                    description: description,
                    type: electrode.type || 'DIXI' // Include the electrode type, default to DIXI if not specified
                };
                console.log(`Created new electrode: ${label} with type: ${electrode.type || 'DIXI'}`);
            }
            
            // Handle contacts based on tissue type
            if (!electrodes[label][contact]) {
                electrodes[label][contact] = {
                    associatedLocation: tissueType,
                    contactDescription: regionName
                };
                console.log(`Added contact ${contact} to electrode ${label}`);
            } else if (tissueType === 'GM' && electrodes[label][contact].associatedLocation === 'GM') {
                // This is a GM/GM case (two entries for the same contact)
                const existingDesc = electrodes[label][contact].contactDescription;
                electrodes[label][contact].associatedLocation = 'GM/GM';
                electrodes[label][contact].contactDescription = `${existingDesc}+${regionName}`;
                console.log(`Updated contact ${contact} in electrode ${label} to GM/GM: ${existingDesc}+${regionName}`);
            }
        });
        
        console.log('Transformation complete. Electrode count:', Object.keys(electrodes).length);
        return electrodes;
    },
    
    // Handle opening a file from the database
    handleFileOpen: async (file, openSavedFile, showError) => {
        try {
            console.log(`Attempting to load file ID: ${file.file_id} (${file.filename})`);
            
            const token = localStorage.getItem('token');
            if (!token) {
                showError('Authentication required to open files');
                return;
            }
            // Use the backend API to check file type and get data
            const response = await fetch(`${backendURL}/api/files/check-type?fileId=${file.file_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to check file type: ${response.statusText}`);
            }
            
            const fileTypeData = await response.json();
            console.log('File type check result:', fileTypeData);
            
            // If localization data exists, fetch the detailed data
            if (fileTypeData.hasLocalization) {
                const localizationResponse = await fetch(`${backendURL}/api/files/localization?fileId=${file.file_id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!localizationResponse.ok) {
                    throw new Error('Failed to fetch localization data');
                }
                
                const localizationData = await localizationResponse.json();
                
                // Transform the database records into the electrode format
                const electrodes = FileUtils.transformLocalizationData(localizationData);
                
                // Open in localization view with the saved data
                openSavedFile('localization', { 
                    name: file.filename || 'Unnamed Anatomy',
                    fileId: file.file_id,
                    fileName: file.filename,
                    creationDate: file.creation_date,
                    modifiedDate: file.modified_date,
                    data: { data: electrodes }
                });
                return;
            }
            
            // Handle designation data
            if (fileTypeData.hasDesignation) {
                console.log('Found designation data:', fileTypeData.designationData);
                openSavedFile('designation', {
                    name: file.filename || 'Unnamed Epilepsy',
                    fileId: file.file_id,
                    fileName: file.filename,
                    creationDate: file.creation_date,
                    modifiedDate: file.modified_date,
                    data: fileTypeData.designationData.designation_data,
                    originalData: fileTypeData.designationData.localization_data
                });
                return;
            }
            
            // Handle test selection data
            if (fileTypeData.hasTestSelection) {
                console.log('Found test selection data:', fileTypeData.testSelectionData);
                openSavedFile('csv-functional-test', {
                    name: file.filename || 'Unnamed Neuropsychology',
                    fileId: file.file_id,
                    fileName: file.filename,
                    creationDate: file.creation_date,
                    modifiedDate: file.modified_date,
                    data: {
                        tests: fileTypeData.testSelectionData.tests,
                        contacts: fileTypeData.testSelectionData.contacts
                    }
                });
                return;
            }
            
            // Handle stimulation data
            if (fileTypeData.hasStimulation) {
                console.log('Found stimulation data:', fileTypeData.stimulationData);
                openSavedFile(fileTypeData.stimulationData.is_mapping ? 'csv-functional-mapping' : 'csv-stimulation', {
                    name: file.filename || 'Unnamed Stimulation',
                    fileId: file.file_id,
                    fileName: file.filename,
                    creationDate: file.creation_date,
                    modifiedDate: file.modified_date,
                    data: {
                        data: fileTypeData.stimulationData.stimulation_data,
                        planOrder: fileTypeData.stimulationData.plan_order
                    }
                });
                return;
            }
            
            // If no data found in any table, create new empty localization
            console.log('No data found for this file, creating new empty localization');
            openSavedFile('localization', { 
                name: file.filename || 'Unnamed Anatomy',
                fileId: file.file_id,
                fileName: file.filename,
                creationDate: file.creation_date,
                modifiedDate: file.modified_date,
                data: { data: {} }
            });
            
        } catch (error) {
            console.error('Error loading file:', error);
            showError(`Failed to load file data: ${error.message}`);
        }
    },
    
    // Fetch user files from the database
    fetchUserFiles: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return [];
            }
            
            const response = await fetch(`${backendURL}/api/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user files');
            }

            const files = await response.json();
            return files || [];
        } catch (error) {
            console.error('Error fetching user files:', error);
            return [];
        }
    }
};

const HomePage = () => {
    const token = localStorage.getItem('token') || null;
    const [tabs, setTabs] = useState(() => {
        const savedTabs = localStorage.getItem('tabs');
        return savedTabs ? JSON.parse(savedTabs) : [{ id: 'home', title: 'Home', content: 'home' }];
    });
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('activeTab') || 'home';
    });
    const [error, setError] = useState("");
    const [localizationCounter, setLocalizationCounter] = useState(1);
    
    useEffect(() => {
        localStorage.setItem('tabs', JSON.stringify(tabs));
        localStorage.setItem('activeTab', activeTab);
    }, [tabs, activeTab]);

    // Make addTab available globally
    useEffect(() => {
        window.addTab = addTab;
        return () => {
            delete window.addTab;
        };
    }, []);

    // Add event listener for designation tab creation
    useEffect(() => {
        const handleAddDesignationTab = (event) => {
            addTab('designation', event.detail);
        };

        const handleCloseTab = (event) => {
            closeTab(event.detail.tabId);
        };

        const handleSetActiveTab = (event) => {
            setActiveTab(event.detail.tabId);
        };

        window.addEventListener('addDesignationTab', handleAddDesignationTab);
        window.addEventListener('closeTab', handleCloseTab);
        window.addEventListener('setActiveTab', handleSetActiveTab);
        
        return () => {
            window.removeEventListener('addDesignationTab', handleAddDesignationTab);
            window.removeEventListener('closeTab', handleCloseTab);
            window.removeEventListener('setActiveTab', handleSetActiveTab);
        };
    }, []);

    // Add event listener for stimulation tab creation
    useEffect(() => {
        const handleAddResectionTab = (event) => {
            addTab('resection', event.detail);
        };

        window.addEventListener('addResectionTab', handleAddResectionTab);
        return () => {
            window.removeEventListener('addResectionTab', handleAddResectionTab);
        };
    }, []);

    // Add event listener for stimulation tab creation
    useEffect(() => {
        const handleAddStimulationTab = (event) => {
            const { data, state, title } = event.detail;
            let type;
            
            // Determine type based on the stimulation type
            switch(data.type) {
                case 'mapping':
                    type = 'functional-mapping';
                    break;
                case 'recreation':
                    type = 'seizure-recreation';
                    break;
                case 'ccep':
                    type = 'cceps';
                    break;
                default:
                    type = 'stimulation';
                    break;
            }

            addTab(type, {
                data: data?.data || data,
                state: state
            });
        };

        window.addEventListener('addStimulationTab', handleAddStimulationTab);
        return () => {
            window.removeEventListener('addStimulationTab', handleAddStimulationTab);
        };
    }, []);

    // Add event listener for functional mapping tab creation
    useEffect(() => {
        const handleAddFunctionalTestTab = (event) => {
            if (event.detail.fromTestSelection) {
                addTab('functional-test', {data: event.detail.data.contacts, tests: event.detail.data.tests, state: event.detail.state});
            } else {
                addTab('functional-test', event.detail);
            }
        };

        window.addEventListener('addFunctionalTestTab', handleAddFunctionalTestTab);
        return () => {
            window.removeEventListener('addFunctionalTestTab', handleAddFunctionalTestTab);
        };
    }, []);

    // Add event listener for documentation tab creation
    useEffect(() => {
        const handleAddFunctionalTestTab = (event) => {
            addTab('usage-docs', event.detail);
        };

        window.addEventListener('addDocumentationTab', handleAddFunctionalTestTab);
        return () => {
            window.removeEventListener('addDocumentationTab', handleAddFunctionalTestTab);
        };
    }, []);

    // Add event listener for db lookup tab creation
    useEffect(() => {
        const handleAddFunctionalTestTab = (event) => {
            addTab('database-lookup', event.detail);
        };

        window.addEventListener('addDatabaseLookupTab', handleAddFunctionalTestTab);
        return () => {
            window.removeEventListener('addDatabaseLookupTab', handleAddFunctionalTestTab);
        };
    }, []);

    useEffect(() => {
        const handleAddFunctionalTestTab = (event) => {
            addTab('brain-mapping-config', event.detail);
        };

        window.addEventListener('openBrainMappingConfig', handleAddFunctionalTestTab);
        return () => {
            window.removeEventListener('openBrainMappingConfig', handleAddFunctionalTestTab);
        };
    }, []);

    useEffect(() => {
        // Find the highest localization number to initialize the counter
        if (tabs.length > 1) {
            const pattern = /Anatomy(\d+)/;
            const numbers = tabs
                .map(tab => {
                    const match = tab.title.match(pattern);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(num => !isNaN(num));
            
            if (numbers.length > 0) {
                const max = Math.max(...numbers);
                setLocalizationCounter(max + 1);
            }
        }
    }, []);

    const addTab = (type, data = null) => {
        const generateUniqueId = () => {
            return Math.floor(Date.now() % 1000000000); // Last 9 digits as integer for fileId
        };

        const generatePatientId = () => {
            // Generate a UUID v4
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        console.log("detail: ", data);

        let title = '';
        let patientId = null;
        let fileId = data?.fileId || data?.state?.fileId || generateUniqueId();

        console.log('Adding new tab:', {
            type,
            data,
            patientIdFromData: data?.patientId,
            patientIdFromState: data?.state?.patientId,
            patientIdFromOriginalData: data?.originalData?.patientId
        });

        switch (type) {
            case 'localization':
                title = 'Anatomy';
                patientId = data ? data.patientId : generatePatientId(); // Generate UUID for patient_id
                break;
            case 'csv-localization':
                title = 'Anatomy';
                patientId = data.patientId ? data.patientId : generatePatientId(); // Generate UUID for patient_id
                break;
            case 'designation':
                title = 'Epilepsy';
                patientId = data.patientId || data.state?.patientId || data.originalData?.patientId;
                console.log('Setting patientId for epilepsy:', {
                    finalPatientId: patientId,
                    sources: {
                        dataPatientId: data.patientId,
                        statePatientId: data.state?.patientId,
                        originalDataPatientId: data.originalData?.patientId
                    }
                });
                break;
            case 'resection':
                title = 'Neurosurgery';
                patientId = data.patientId || data.state?.patientId || data.originalData?.patientId;
                console.log('Setting patientId for neurosurgery:', {
                    finalPatientId: patientId,
                    sources: {
                        dataPatientId: data.patientId,
                        statePatientId: data.state?.patientId,
                        originalDataPatientId: data.originalData?.patientId
                    }
                });
                break;
            case 'csv-designation':
                title = data.name;
                patientId = generatePatientId();
                break;
            case 'csv-stimulation':     
                title = data.name;
                patientId = data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'csv-functional-mapping': 
                title = data.name;
                patientId = data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'csv-functional-test':       
                title = data.name;
                patientId = data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'stimulation':         
                title = 'Plan Type Selection';
                patientId = data.patientId || data.state?.patientId || data.originalData?.patientId;
                console.log('Setting patientId for stimulation:', {
                    finalPatientId: patientId,
                    sources: {
                        dataPatientId: data.patientId,
                        statePatientId: data.state?.patientId,
                        originalDataPatientId: data.originalData?.patientId
                    }
                });
                break;
            case 'seizure-recreation':
                title = 'Seizure Recreation';
                patientId = data?.state?.patientId ? data.state.patientId : data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'cceps':
                title = 'CCEPs';
                patientId = data?.state?.patientId ? data.state.patientId : data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'functional-mapping':
                title = 'Functional Mapping';
                patientId = data?.state?.patientId ? data.state.patientId : data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'functional-test':
                title = 'Neuropsychology';
                patientId = data?.state?.patientId ? data.state.patientId : data.patientId ? data.patientId : generatePatientId(); // Use existing patient_id from parent localization
                break;
            case 'database-lookup':     title = 'Lookup'; break;
            case 'brain-mapping-config':
                title = 'Brain Mapping Config';                
                break;
            default:
                return null;
        }

        console.log("fileId from detail: ", data?.fileId);
        const newTab = {
            id: Date.now().toString(),
            title: title,
            content: type,
            data: data,
            state: {
                fileId: fileId,
                patientId: patientId, // Include patient_id in the state
                fileName: title,
                creationDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            }
        };

        console.log("newTab", newTab)
        
        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTab(newTab.id);
    };

    const updateTabState = (tabId, newState) => {
        setTabs(prevTabs => 
            prevTabs.map(tab => 
                tab.id === tabId 
                    ? { 
                        ...tab, 
                        state: {
                            ...tab.state,
                            ...Object.fromEntries(
                                Object.entries(newState).map(([key, value]) => [
                                    key,
                                    typeof value === 'object' && value !== null
                                        ? JSON.parse(JSON.stringify(value))
                                        : value
                                ])
                            )
                        }
                    }
                    : tab
            )
        );
    };

    const updateTabContent = (tabId, newContent) => {
        setTabs(prevTabs => 
            prevTabs.map(tab => 
                tab.id === tabId 
                    ? { ...tab, content: newContent }
                    : tab
            )
        );
    };

    const renameTab = (tabId, newTitle) => {
        setTabs(prevTabs => 
            prevTabs.map(tab => {
                if (tab.id === tabId) {
                    const updatedTab = { 
                        ...tab, 
                        title: newTitle,
                        state: {
                            ...tab.state,
                            fileName: newTitle
                        }
                    };
                    return updatedTab;
                }
                return tab;
            })
        );
    };

    const closeTab = (tabId) => {
        // If tabId is an array, close all tabs in the array
        const tabsToClose = Array.isArray(tabId) ? tabId : [tabId];
        
        setTabs(prevTabs => {
            // First, find any duplicate designation tabs for the same patient
            const tabsToRemove = new Set(tabsToClose);
            
            // If we're closing a designation tab, find all other designation tabs for the same patient
            const closingTab = prevTabs.find(tab => tabsToClose.includes(tab.id));
            if (closingTab?.content === 'designation' && closingTab?.state?.patientId) {
                prevTabs.forEach(tab => {
                    if (tab.content === 'designation' && 
                        tab.state?.patientId === closingTab.state.patientId && 
                        tab.id !== closingTab.id) {
                        tabsToRemove.add(tab.id);
                    }
                });
            }
            
            const newTabs = prevTabs.filter(tab => !tabsToRemove.has(tab.id));
            
            // If the active tab was closed, set the active tab to the last remaining tab
            // or to 'home' if no tabs remain
            if (tabsToClose.includes(activeTab)) {
                const newActiveTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'home';
                setActiveTab(newActiveTab);
            }
            
            // Update localStorage with the new tabs
            localStorage.setItem('tabs', JSON.stringify(newTabs));
            
            return newTabs;
        });
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setError("");

        try {
            const { identifier, data, metadata } = await parseCSVFile(file, false, (msg) => setError(msg));
            // Check for existing designation tabs
            const tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
            if (identifier.includes(Identifiers.LOCALIZATION)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'localization' || tab.content === 'csv-localization') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('localization', { name: 'Anatomy', data: {data: data}, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            } else if (identifier.includes(Identifiers.RESECTION)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'resection' || tab.content === 'csv-resection') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('resection', { name: 'Neurosurgery', data: data.data, originalData: data.originalData, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            } else if (identifier.includes(Identifiers.DESIGNATION)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'designation' || tab.content === 'csv-designation') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('designation', { name: 'Epilepsy', data: data.data, originalData: data.originalData, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            } else if (identifier.includes(Identifiers.STIMULATION_FUNCTION)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'functional-mapping' || tab.content === 'csv-functional-mapping') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('functional-mapping', { name: 'Functional Mapping', data: data, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            }else if (identifier.includes(Identifiers.STIMULATION_RECREATION)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'seizure-recreation' || tab.content === 'csv-seizure-recreation') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('seizure-recreation', { name: 'Seizure Recreation', data: data, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            }else if (identifier.includes(Identifiers.STIMULATION_CCEP)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'cceps' || tab.content === 'csv-cceps') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('cceps', { name: 'CCEPs', data: data, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            }else if (identifier.includes(Identifiers.TEST_PLANNING)) {
                const existingTab = tabs.find(tab =>
                    (tab.content === 'functional-test' || tab.content === 'csv-functional-test') &&
                    tab.state?.patientId === metadata.patientId
                );
                if (existingTab) {
                    // Close the existing tab
                    closeTab(existingTab.id);
                }
                openSavedFile('csv-functional-test', { name: 'Neuropsychology', data: {data : data}, patientId: metadata.patientId, creationDate: metadata.creationDate, modifiedDate: metadata.modifiedDate, fileId: metadata.fileId });
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = () => {
        setTabs([{ id: 'home', title: 'Home', content: 'home' }]);
        setActiveTab('home');
    };

    const openSavedFile = (type, fileData, active = true) => {
        if (type === 'localization') {
            console.log('Opening saved file:', fileData);
            
            // Create a new tab with the loaded file data
            const newTab = {
                id: Date.now().toString(),
                title: fileData.name,
                content: 'csv-localization',  // Use csv-localization to reuse existing code path
                data: fileData.data,
                state: {
                    fileId: parseInt(fileData.fileId),  // Ensure fileId is an integer
                    patientId: fileData.patientId,
                    fileName: fileData.name,
                    creationDate: fileData.creationDate || new Date().toISOString(),
                    modifiedDate: fileData.modifiedDate || new Date().toISOString(),
                    electrodes: fileData.data.data  // Preserve loaded electrode data including type
                }
            };
            
            console.log('Created new tab with state:', newTab.state);
            
            setTabs(prevTabs => [...prevTabs, newTab]);
            if (active) {
                setActiveTab(newTab.id);
            }
        } 
        else if (type === 'designation') {
            console.log('Opening saved file:', fileData);
            
            const newTab = {
                id: Date.now().toString(),
                title: fileData.name,
                content: 'designation',
                data: { data: fileData.data, originalData: fileData.originalData },
                state: {
                    fileId: parseInt(fileData.fileId),  // Ensure fileId is an integer
                    patientId: fileData.patientId,
                    fileName: fileData.name,
                    creationDate: fileData.creationDate || new Date().toISOString(),
                    modifiedDate: fileData.modifiedDate || new Date().toISOString(),
                    electrodes: fileData.data,
                    localizationData: fileData.originalData  // This should include the electrode type
                }
            };

            console.log('Created new tab with state:', newTab.state);

            setTabs(prevTabs => [...prevTabs, newTab]);
            setActiveTab(newTab.id);
        }
        else if (type === 'resection') {
            console.log('Opening saved resection file:', fileData);

            // Ensure data is always an array of electrodes
            let electrodes = fileData.data;
            if (typeof electrodes === 'string') {
                electrodes = parseCSVFile(electrodes, false).data;
            } else if (electrodes && !Array.isArray(electrodes) && electrodes.electrodes) {
                electrodes = electrodes.electrodes;
            }

            // Ensure each contact has a unique id
            if (Array.isArray(electrodes)) {
                electrodes = electrodes.map(electrode => ({
                    ...electrode,
                    contacts: Array.isArray(electrode.contacts)
                        ? electrode.contacts.map((contact, idx) => ({
                            ...contact,
                            id: contact.id || `${electrode.label}${(contact.index || idx + 1)}`
                        }))
                        : []
                }));
            }
            
            const newTab = {
                id: Date.now().toString(),
                title: fileData.name,
                content: 'resection',
                data: electrodes,
                state: {
                    fileId: parseInt(fileData.fileId),
                    patientId: fileData.patientId,
                    fileName: fileData.name,
                    creationDate: fileData.creationDate || new Date().toISOString(),
                    modifiedDate: fileData.modifiedDate || new Date().toISOString(),
                    electrodes: electrodes,
                    localizationData: fileData.originalData
                }
            };

            console.log('Created new resection tab with state:', newTab.state);

            setTabs(prevTabs => [...prevTabs, newTab]);
            setActiveTab(newTab.id);
        }
        else if (type === 'csv-functional-test') {
            const tests = fileData.data?.tests || fileData.data.data?.tests || [];
            const contacts = fileData.data?.contacts || fileData.data.data?.contacts || [];
            const newTab = {
                id: Date.now().toString(),
                title: fileData.name,
                content: type,
                data: {
                    data: contacts, // Pass the array of electrodes
                    tests: tests
                },
                state: {
                    fileId: parseInt(fileData.fileId),
                    patientId: fileData.patientId,
                    fileName: fileData.name,
                    creationDate: fileData.creationDate || new Date().toISOString(),
                    modifiedDate: fileData.modifiedDate || new Date().toISOString(),
                    tests: tests,
                    contacts: contacts
                }
            };

            console.log('Created new test selection tab with state:', newTab.state);

            setTabs(prevTabs => [...prevTabs, newTab]);
            setActiveTab(newTab.id);
        }
        else if (type === 'cceps' || type === 'functional-mapping' || type === 'seizure-recreation') {
            console.log('Opening saved stimulation file:', fileData);

            const newTab = {
                id: Date.now().toString(),
                title: fileData.name,
                content: type,
                data: fileData.data,
                state: {
                    fileId: parseInt(fileData.fileId),  // Ensure fileId is an integer
                    patientId: fileData.patientId,
                    fileName: fileData.name,
                    creationDate: fileData.creationDate || new Date().toISOString(),
                    modifiedDate: fileData.modifiedDate || new Date().toISOString(),
                    electrodes: fileData.data.data,
                    planOrder: fileData.data.planOrder,
                    type: type
                }
            };

            console.log('Created new stimulation tab with state:', newTab.state);

            setTabs(prevTabs => [...prevTabs, newTab]);
            setActiveTab(newTab.id);
        } else {
            // Fallback to basic tab creation
            addTab(type, { name: fileData.name });
        }
    };

    // Make handleFileClick available globally for the database modal
    window.handleFileClick = (file) => {
        FileUtils.handleFileOpen(file, openSavedFile, (message) => {
            console.error('Error loading file:', message);
        });
    };

    const renderTabContent = () => {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        switch (currentTab.content) {
            case 'home':
                return (
                    <div className="bg-gray-100 h-full px-7 flex flex-col-reverse justify-end items-center
                                    md:px-14
                                    lg:px-24 lg:flex-row lg:justify-start lg:items-start
                                    xl:px-35">
                        {token ? (
                            <>
                                <div className="lg:basis-6 lg:flex-auto mt-15 flex flex-col">
                                    <Activity openSavedFile={openSavedFile} />
                                    <RecentFiles
                                        onOpenFile={openSavedFile}
                                        className="mt-2 lg:mt-5"
                                    />
                                </div>
                                <Center 
                                    token={token} 
                                    onNewLocalization={() => addTab('localization')}
                                    onFileUpload={handleFileUpload}
                                    error={error}
                                    openSavedFile={openSavedFile}
                                />
                                <div className="lg:basis-6 lg:flex-auto"></div>
                            </>
                        ) : (
                            <Center 
                                onNewLocalization={() => addTab('localization')}
                                onFileUpload={handleFileUpload}
                                error={error}
                                openSavedFile={openSavedFile}
                            />
                        )}
                    </div>
                );
            case 'localization':
                return <Localization 
                    key={currentTab.id}
                    initialData={{}}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'csv-localization':
                return <Localization
                    key={currentTab.id}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'designation':
                return <Designation
                    key={currentTab.id}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'csv-designation':
                return <Designation
                    key={currentTab.id}
                    initialData={currentTab.data.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'resection':
                return <Resection
                    key={currentTab.id}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'csv-resection':
                return <Resection
                    key={currentTab.id}
                    initialData={currentTab.data.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'stimulation':
                return <PlanTypePage
                    key={currentTab.id}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    switchContent={(newContent) => updateTabContent(currentTab.id, newContent)}
                />;
            case 'seizure-recreation':
            case 'cceps':
            case 'functional-mapping':
                return <ContactSelection
                    key={`${currentTab.id}-${currentTab.content}`}
                    type={currentTab.content === 'functional-mapping' ? 'mapping' : 
                          currentTab.content === 'seizure-recreation' ? 'recreation' : 'ccep'}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    switchContent={(newContent) => updateTabContent(currentTab.id, newContent)}
                    savedState={currentTab.state}
                />;
            case 'csv-stimulation':
                return <ContactSelection
                    key={`${currentTab.id}-csv-stimulation`}
                    type={currentTab.data?.type || 'recreation'}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    switchContent={(newContent) => updateTabContent(currentTab.id, newContent)}
                    savedState={currentTab.state}
                />;
            case 'csv-functional-mapping':
                return <ContactSelection
                    key={`${currentTab.id}-csv-functional-mapping`}
                    type="mapping"
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    switchContent={(newContent) => updateTabContent(currentTab.id, newContent)}
                    savedState={currentTab.state}
                />;
            case 'functional-test':
            case 'csv-functional-test':
                return <FunctionalTestSelection
                    key={currentTab.id}
                    initialData={currentTab.data}
                    switchContent={(newContent) => updateTabContent(currentTab.id, newContent)}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'usage-docs':
                return <UserDocumentation
                    key={currentTab.id}
                    initialData={currentTab.data}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />
            case 'database-lookup':
                return <DBLookup
                    key={currentTab.id}
                    initialData={{}}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            case 'brain-mapping-config':
                return <BrainMapping
                    key={currentTab.id}
                    initialData={{}}
                    onStateChange={(newState) => updateTabState(currentTab.id, newState)}
                    savedState={currentTab.state}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="h-dvh flex flex-col">
            <div className="flex flex-col border-b">
                <div className="flex">
                    {tabs.filter(tab => !tab.state?.patientId).map(tab => (
                        <Tab
                            key={tab.id}
                            title={tab.title}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            onClose={() => closeTab(tab.id)}
                            onRename={(newTitle) => renameTab(tab.id, newTitle)}
                        />
                    ))}
                    
                    {/* Group tabs by patient ID */}
                    {Array.from(new Set(tabs
                        .filter(tab => tab.state?.patientId)
                        .map(tab => tab.state.patientId)))
                        .map(patientId => (
                            <PatientTabGroup
                                key={patientId}
                                patientId={patientId}
                                tabs={tabs}
                                activeTab={activeTab}
                                onTabClick={setActiveTab}
                                onTabClose={closeTab}
                                onTabRename={renameTab}
                            />
                        ))
                    }
                    
                    <button 
                        className="px-4 py-2 text-gray-600 cursor-pointer hover:text-gray-800"
                        onClick={() => addTab('localization')}
                    >
                        +
                    </button>
                </div>
            </div>
            {token && <UserProfile onSignOut={handleSignOut} />}

            <div className="grow">
                {renderTabContent()}
            </div>
        </div>
    );
};

const Center = ({ token, onNewLocalization, onFileUpload, error, openSavedFile }) => {
    const [showDatabaseModal, setShowDatabaseModal] = useState(false);
    const [patients, setPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showLegend, setShowLegend] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { showError } = useError();
    const { showWarning } = useWarning();

    const loadPatients = async (page = 1) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${backendURL}/api/patients/recent?page=${page}&limit=7`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch patients');
            }

            const data = await response.json();
            setPatients(data.patients);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        } catch (error) {
            if (error.name === "NetworkError" || error.message.toString().includes("NetworkError")) {
                showWarning("No internet connection. Failed to load patients");
            } else {
                console.error('Error loading patients:', error);
                showError('Failed to load patients');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            loadPatients(newPage);
        }
    };

    // Generate array of page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5; // Maximum number of page buttons to show
        
        if (totalPages <= maxVisiblePages) {
            // If total pages is less than max visible, show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            // Calculate start and end of visible pages
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            // Adjust if at the start
            if (currentPage <= 2) {
                end = 4;
            }
            // Adjust if at the end
            if (currentPage >= totalPages - 1) {
                start = totalPages - 3;
            }
            // Add ellipsis if needed
            if (start > 2) {
                pages.push('...');
            }            
            // Add middle pages
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            // Add ellipsis if needed
            if (end < totalPages - 1) {
                pages.push('...');
            }
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    };
    
    return (
        <div className="px-2 mt-[3vb] flex flex-col justify-center items-center
                        md:px-7
                        lg:px-12 lg:mt-[10vb] lg:basis-7 lg:flex-auto
                        xl:px-15">
            <Logo />
            {token ? (
                <>
                    <button
                        className="border-solid border border-sky-800 bg-sky-600 text-white font-semibold rounded-xl w-34 mt-3 py-1 text-xs align-middle transition-colors duration-200 cursor-pointer hover:bg-sky-800
                                   md:w-40 md:text-sm
                                   lg:w-48 lg:mt-4 lg:py-2 lg:text-md
                                   xl:w-64 xl:mt-5 xl:py-3 xl:text-lg"
                        onClick={onNewLocalization}
                    >
                        Create New Patient
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={onFileUpload}
                        style={{ display: 'none' }}
                        id="fileInput"
                    />
                    <Dropdown
                        closedText="Open Patient Files"
                        openText="Open Patient Files ▾"
                        closedClassName="border-solid border border-sky-800 bg-sky-600 text-white font-semibold rounded-xl w-34 mt-3 py-1 text-xs transition-colors duration-200 cursor-pointer hover:bg-sky-800
                                         md:w-40 md:text-sm
                                         lg:w-48 lg:mt-4 lg:py-2 lg:text-md
                                         xl:w-64 xl:mt-5 xl:py-3 xl:text-lg"
                        openClassName="border-solid border border-sky-800 bg-sky-800 text-white font-semibold rounded-xl w-34 mt-3 py-1 text-xs transition-colors duration-200 cursor-pointer hover:bg-sky-700
                                       md:w-40 md:text-sm
                                       lg:w-48 lg:mt-4 lg:py-2 lg:text-md
                                       xl:w-64 xl:mt-5 xl:py-3 xl:text-lg"
                        options="From-CSV-File From-Database"
                        optionClassName="block w-34 py-1 text-xs text-gray-700 hover:bg-gray-100
                                         md:w-40
                                         lg:w-48 lg:py-2 lg:text-sm
                                         xl:w-64"
                        menuClassName="w-34 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none
                                       md:w-40
                                       lg:w-48
                                       xl:w-64"
                        onOptionClick={(option) => {
                            switch(option) {
                                case "From-CSV-File":
                                    document.getElementById('fileInput').click();
                                    break;
                                case "From-Database":
                                    loadPatients(1);
                                    setShowDatabaseModal(true);
                                    break;
                            }
                        }}
                    />
                    <button
                        className="border-solid border border-sky-800 bg-sky-600 text-white font-semibold rounded-xl w-34 mt-3 py-1 text-xs align-middle transition-colors duration-200 cursor-pointer hover:bg-sky-800
                                   md:w-40 md:text-sm
                                   lg:w-48 lg:mt-4 lg:py-2 lg:text-md
                                   xl:w-64 xl:mt-5 xl:py-3 xl:text-lg"
                        onClick={() => window.dispatchEvent(new CustomEvent('addDatabaseLookupTab'))}
                    >
                        Structure-Function-Test Lookup
                    </button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                    <button
                        className="border-solid border border-sky-800 bg-sky-600 text-white font-semibold rounded-xl w-34 mt-3 py-1 text-xs align-middle transition-colors duration-200 cursor-pointer hover:bg-sky-800
                                   md:w-40 md:text-sm
                                   lg:w-48 lg:mt-4 lg:py-2 lg:text-md
                                   xl:w-64 xl:mt-5 xl:py-3 xl:text-lg"
                        onClick={() => window.dispatchEvent(new CustomEvent('openBrainMappingConfig'))}
                    >
                        Brain Config Mapping
                    </button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}

                    {/* Database Patients Modal */}
                    {showDatabaseModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-4/5 max-w-3xl max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center">
                                        <h2 className="text-2xl font-bold">Select Patient</h2>
                                        <button 
                                            onClick={() => setShowLegend(true)}
                                            className="ml-3 text-gray-500 hover:text-gray-700 text-xl cursor-pointer"
                                            title="Show Legend"
                                        >
                                            ?
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowDatabaseModal(false)}
                                        className="text-gray-500 transition-colors duration-200 cursor-pointer hover:text-gray-700 text-xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                {isLoading ? (
                                    <div className="text-center py-3 md:py-4 lg:py-6 xl:py-8">
                                        <p className="text-gray-600">Loading patients...</p>
                                    </div>
                                ) : patients.length === 0 ? (
                                    <div className="text-center py-3 md:py-4 lg:py-6 xl:py-8">
                                        <p className="text-gray-600">No patients found. Create a new file to get started.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="divide-y">
                                            {patients.map(patient => (
                                                <div 
                                                    key={patient.patient_id}
                                                    className="py-3 px-4 transition-colors duration-200 hover:bg-sky-50 cursor-pointer flex justify-between items-center"
                                                    onClick={() => {
                                                        setSelectedPatient(patient);
                                                        setShowDatabaseModal(false);
                                                    }}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium">{formatPatientDisplay(patient)}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {patient.has_localization && (
                                                            <span className="mr-2 cursor-help" title="Anatomy File">📍</span>
                                                        )}
                                                        {patient.has_designation && (
                                                            <span className="mr-2 cursor-help" title="Epilepsy File">📝</span>
                                                        )}
                                                        {patient.has_resection && (
                                                            <span className="mr-2 cursor-help" title="Neurosurgery File">🔪</span>
                                                        )}
                                                        {(patient.stimulation_types.mapping || patient.stimulation_types.recreation || patient.stimulation_types.ccep) && (
                                                            <span className="mr-2 cursor-help" title="Stimulation File">⚡</span>
                                                        )}
                                                        {patient.has_test_selection && (
                                                            <span className="cursor-help" title="Neuropsychology File">🧪</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination Controls */}
                                        <div className="mt-3 flex flex-col gap-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className={`px-3 py-1 rounded transition-colors duration-200 ${
                                                        currentPage === 1
                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                            : 'bg-sky-700 text-white hover:bg-sky-600 cursor-pointer'
                                                    }`}
                                                >
                                                    ←
                                                </button>
                                                
                                                {getPageNumbers().map((pageNum, index) => (
                                                    pageNum === '...' ? (
                                                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
                                                    ) : (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => handlePageChange(pageNum)}
                                                            className={`px-3 py-1 rounded transition-colors duration-200 ${
                                                                currentPage === pageNum
                                                                    ? 'bg-sky-700 text-white'
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    )
                                                ))}
                                                
                                                <button
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className={`px-3 py-1 rounded transition-colors duration-200 ${
                                                        currentPage === totalPages
                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                            : 'bg-sky-700 text-white hover:bg-sky-600 cursor-pointer'
                                                    }`}
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedPatient && (
                        <PatientDetails
                            patient={selectedPatient}
                            onClose={() => setSelectedPatient(null)}
                            openSavedFile={openSavedFile}
                        />
                    )}

                    <Legend isOpen={showLegend} onClose={() => setShowLegend(false)} />
                </>
            ) : <SignInButtons />}
        </div>
    );
};

const Activity = ({ openSavedFile }) => {
    return (
        <div className="lg:mt-20 xl:mt-25">
            <h2 className="text-xl font-bold my-1 whitespace-nowrap
                           md:text-2xl
                           lg:text-3xl lg:my-2
                           xl:text-4xl xl:my-3">
                My Files
            </h2>
            <div className="mx-2">
                <NewSharedFile openSavedFile={openSavedFile} />
                <Approved />
            </div>
        </div>
    );
};

const Legend = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">File Type Legend</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                        ×
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center">
                        <span className="text-xl mr-3">📍</span>
                        <span>Anatomy File</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xl mr-3">📝</span>
                        <span>Epilepsy File</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xl mr-3">🔪</span>
                        <span>Neurosurgery File</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xl mr-3">⚡</span>
                        <span>Stimulation File</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xl mr-3">🧪</span>
                        <span>Neuropsychology File</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PatientDetails = ({ patient, onClose, openSavedFile }) => {
    const { showError } = useError();
    const { showWarning } = useWarning();
    const [clickedFileId, setClickedFileId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showLegend, setShowLegend] = useState(false);
    const [showStimulationMenu, setShowStimulationMenu] = useState(false);
    const buttons = [
        {
            name: 'Anatomy',
            type: 'localization',
            exists: patient.has_localization,
            fileId: patient.localization_file_id,
            message: 'No anatomy file created yet',
            icon: '📍'
        },
        {
            name: 'Epilepsy',
            type: 'designation',
            exists: patient.has_designation,
            fileId: patient.designation_file_id,
            message: 'No epilepsy file created yet',
            icon: '📝'
        },
        {
            name: 'Neurosurgery',
            type: 'resection',
            exists: patient.has_resection,
            fileId: patient.resection_file_id,
            message: 'No neurosurgery file created yet',
            icon: '🔪'
        },
        {
            name: 'Stimulation',
            type: 'stimulation',
            exists: patient.stimulation_types.mapping || patient.stimulation_types.recreation || patient.stimulation_types.ccep,
            fileId: null, // This will be set based on the selected type
            message: 'No stimulation file created yet',
            icon: '⚡'
        },
        {
            name: 'Neuropsychology',
            type: 'functional-test',
            exists: patient.has_test_selection,
            fileId: patient.test_selection_file_id,
            message: 'No neuropsychology file created yet',
            icon: '🧪'
        }
    ];

    const handleButtonClick = async (clickedButton, selectedStimulationType = null) => {
        if (!clickedButton.exists) return;

        const token = localStorage.getItem('token');
        if (!token) {
            showError('Authentication required to open files');
            return;
        }

        try {
            setIsLoading(true);
            setClickedFileId(clickedButton.fileId);

            // First check if any tabs for this patient already exist
            const existingTabs = JSON.parse(localStorage.getItem('tabs') || '[]');
            const existingTab = existingTabs.find(tab => ((tab.title === clickedButton.name) || (tab.title === selectedStimulationType))
                                                            && tab.state?.patientId === patient.patient_id);

            if (existingTab) {
                // If tab exists, just switch to it
                window.dispatchEvent(new CustomEvent('setActiveTab', { detail: { tabId: existingTab.id } }));
                onClose();
                return;
            }
            else {
                const existingPatientTab = existingTabs.find(tab => tab.state?.patientId === patient.patient_id);
                if (existingPatientTab) {
                    // Close all tabs for this patient
                    const patientTabIds = existingTabs
                        .filter(tab => tab.state?.patientId === patient.patient_id)
                        .map(tab => tab.id);
                    for (const tabId of patientTabIds) {
                        window.dispatchEvent(new CustomEvent('closeTab', { detail: { tabId: tabId } }));
                    }
                }
            }

            // If this is a shared file, mark it as seen
            try {
                console.log('Attempting to mark files as seen for patient:', patient.patient_id);
                // Mark each file as seen
                const fileIds = [];
                if (patient.localization_file_id) fileIds.push(patient.localization_file_id);
                if (patient.designation_file_id) fileIds.push(patient.designation_file_id);
                if (patient.resection_file_id) fileIds.push(patient.resection_file_id);
                if (patient.test_selection_file_id) fileIds.push(patient.test_selection_file_id);
                if (patient.stimulation_types.mapping) fileIds.push(patient.stimulation_types.mapping);
                if (patient.stimulation_types.recreation) fileIds.push(patient.stimulation_types.recreation);
                if (patient.stimulation_types.ccep) fileIds.push(patient.stimulation_types.ccep);

                console.log('Files to mark as seen:', fileIds);

                // Mark each file as seen
                await Promise.all(fileIds.map(async (fileId) => {
                    console.log('Marking file as seen:', fileId);
                    const markSeenResponse = await fetch(`${backendURL}/api/mark-file-seen/${fileId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!markSeenResponse.ok) {
                        const errorText = await markSeenResponse.text();
                        console.error('Failed to mark file as seen:', fileId, 'Response:', errorText);
                        throw new Error(`Failed to mark file as seen: ${errorText}`);
                    }

                    const responseData = await markSeenResponse.json();
                    console.log('Successfully marked file as seen:', fileId, 'Response:', responseData);
                }));

                console.log('All files marked as seen successfully');
                // Dispatch event to refresh shared files list
                window.dispatchEvent(new CustomEvent('refreshSharedFiles'));
            } catch (error) {
                console.error('Error marking files as seen:', error);
                // Continue with opening the file even if marking as seen fails
            }

            // If no existing tab found, proceed with loading all files for this patient
            const availableFiles = await Promise.all(
                buttons
                    .filter(button => button.exists)
                    .map(async (button) => {
                        // For stimulation types, we need to handle each type separately
                        if (button.type === 'stimulation') {
                            const stimulationFiles = [];
                            
                            // Handle each stimulation type
                            if (patient.stimulation_types.mapping) {
                                const mappingFile = await loadStimulationFile('Functional Mapping', patient.stimulation_types.mapping);
                                if (mappingFile) stimulationFiles.push(mappingFile);
                            }
                            if (patient.stimulation_types.recreation) {
                                const recreationFile = await loadStimulationFile('Seizure Recreation', patient.stimulation_types.recreation);
                                if (recreationFile) stimulationFiles.push(recreationFile);
                            }
                            if (patient.stimulation_types.ccep) {
                                const ccepFile = await loadStimulationFile('CCEPs', patient.stimulation_types.ccep);
                                if (ccepFile) stimulationFiles.push(ccepFile);
                            }
                            
                            return stimulationFiles;
                        }

                        // For other file types, proceed as normal
                        const response = await fetch(`${backendURL}/api/files/check-type?fileId=${button.fileId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!response.ok) throw new Error('Failed to check file type');
                        const fileTypeData = await response.json();

                        const metadataResponse = await fetch(`${backendURL}/api/files/dates-metadata?fileId=${button.fileId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!metadataResponse.ok) throw new Error('Failed to fetch file metadata');
                        const metadata = await metadataResponse.json();

                        switch (button.type) {
                            case 'resection': {
                                if (!fileTypeData.hasResection) {
                                    throw new Error('No resection data found');
                                }
                                console.log('resection file type data:', fileTypeData.resectionData);
                                return {
                                    fileId: button.fileId,
                                    name: button.name,
                                    creationDate: metadata.creation_date || new Date().toISOString(),
                                    modifiedDate: metadata.modified_date || new Date().toISOString(),
                                    patientId: patient.patient_id,
                                    type: 'resection',
                                    data: fileTypeData.resectionData.resection_data,
                                    originalData: fileTypeData.resectionData.localization_data
                                };
                            }
                            case 'designation': {
                                if (!fileTypeData.hasDesignation) {
                                    throw new Error('No designation data found');
                                }
                                return {
                                    fileId: button.fileId,
                                    name: button.name,
                                    creationDate: metadata.creation_date || new Date().toISOString(),
                                    modifiedDate: metadata.modified_date || new Date().toISOString(),
                                    patientId: patient.patient_id,
                                    type: 'designation',
                                    data: fileTypeData.designationData.designation_data,
                                    originalData: fileTypeData.designationData.localization_data
                                };
                            }
                            
                            case 'localization': {
                                if (fileTypeData.hasLocalization) {
                                    const localizationResponse = await fetch(`${backendURL}/api/files/localization?fileId=${button.fileId}`, {
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        }
                                    });
                                    if (!localizationResponse.ok) throw new Error('Failed to fetch localization data');
                                    const localizationData = await localizationResponse.json();
                                    const transformedData = FileUtils.transformLocalizationData(localizationData);
                                    return {
                                        fileId: button.fileId,
                                        name: button.name,
                                        creationDate: metadata.creation_date || new Date().toISOString(),
                                        modifiedDate: metadata.modified_date || new Date().toISOString(),
                                        patientId: patient.patient_id,
                                        type: 'localization',
                                        data: { data: transformedData }
                                    };
                                }
                                return {
                                    fileId: button.fileId,
                                    name: button.name,
                                    creationDate: metadata.creation_date || new Date().toISOString(),
                                    modifiedDate: metadata.modified_date || new Date().toISOString(),
                                    patientId: patient.patient_id,
                                    type: 'localization',
                                    data: { data: {} }
                                };
                            }
                            case 'functional-test': {
                                if (!fileTypeData.hasTestSelection) {
                                    throw new Error('No test selection data found');
                                }
                                return {
                                    fileId: button.fileId,
                                    name: button.name,
                                    creationDate: metadata.creation_date || new Date().toISOString(),
                                    modifiedDate: metadata.modified_date || new Date().toISOString(),
                                    patientId: patient.patient_id,
                                    type: 'csv-functional-test',
                                    data: {
                                        data : {
                                            tests: fileTypeData.testSelectionData.tests,
                                            contacts: fileTypeData.testSelectionData.contacts
                                        }
                                    }
                                };
                            }
                            default:
                                throw new Error(`Unknown file type: ${button.type}`);
                        }
                    })
            );

            // Flatten the array of files (since stimulation files are now an array)
            const flattenedFiles = availableFiles.flat();

            // Add tabs for each available file sequentially
            for (const file of flattenedFiles) {
                console.log('Opening file:', file);
                await new Promise(resolve => setTimeout(resolve, 100)); // Add a small delay between each file
                openSavedFile(file.type, file);
            }

            // After opening all files, switch to the appropriate tab
            const tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
            let targetTab;
            
            if (selectedStimulationType) {
                // If a specific stimulation type was selected, find that tab
                targetTab = tabs.find(tab => 
                    tab.title === selectedStimulationType && 
                    tab.state?.patientId === patient.patient_id
                );
            } else {
                // Otherwise, find the tab for the clicked button
                targetTab = tabs.find(tab => 
                    tab.title === clickedButton.name && 
                    tab.state?.patientId === patient.patient_id
                );
            }
            
            if (targetTab) {
                window.dispatchEvent(new CustomEvent('setActiveTab', { detail: { tabId: targetTab.id } }));
            }
            
            onClose();
        } catch (error) {
            console.error('Error loading files:', error);
            showError(`Failed to load files: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to load stimulation files
    const loadStimulationFile = async (type, fileId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await fetch(`${backendURL}/api/files/check-type?fileId=${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to check file type');
            const fileTypeData = await response.json();
            
            if (!fileTypeData.hasStimulation) return null;

            const metadataResponse = await fetch(`${backendURL}/api/files/dates-metadata?fileId=${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!metadataResponse.ok) throw new Error('Failed to fetch file metadata');
            const metadata = await metadataResponse.json();

            return {
                fileId: fileId,
                name: type,
                patientId: patient.patient_id,
                creationDate: metadata.creation_date || new Date().toISOString(),
                modifiedDate: metadata.modified_date || new Date().toISOString(),
                type: type === 'Functional Mapping' ? 'functional-mapping' : 
                      type === 'Seizure Recreation' ? 'seizure-recreation' : 'cceps',
                data: {
                    data: fileTypeData.stimulationData.stimulation_data,
                    planOrder: fileTypeData.stimulationData.plan_order
                }
            };
        } catch (error) {
            console.error('Error loading stimulation file:', error);
            return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-5/6 max-w-5xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center">
                        <h2 className="text-2xl font-bold">{formatPatientDisplay(patient)}</h2>
                        <button 
                            onClick={() => setShowLegend(true)}
                            className="ml-3 text-gray-500 hover:text-gray-700 text-xl cursor-pointer"
                            title="Show Legend"
                        >
                            ?
                        </button>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                        ×
                    </button>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => handleButtonClick(buttons[0])}
                        className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-colors duration-200
                            ${buttons[0].exists 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        disabled={!buttons[0].exists || isLoading}
                    >
                        <span className="mr-2">{buttons[0].icon}</span>
                        {buttons[0].name}
                    </button>
                    <button
                        onClick={() => handleButtonClick(buttons[1])}
                        className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-colors duration-200
                            ${buttons[1].exists 
                                ? 'bg-sky-700 text-white hover:bg-sky-600' 
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        disabled={!buttons[1].exists || isLoading}
                    >
                        <span className="mr-2">{buttons[1].icon}</span>
                        {buttons[1].name}
                    </button>
                    <button
                        onClick={() => handleButtonClick(buttons[2])}
                        className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-colors duration-200
                            ${buttons[2].exists 
                                ? 'bg-sky-700 text-white hover:bg-sky-600' 
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        disabled={!buttons[2].exists || isLoading}
                    >
                        <span className="mr-2">{buttons[2].icon}</span>
                        {buttons[2].name}
                    </button>
                    <button
                        onClick={() => handleButtonClick(buttons[4])}
                        className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-colors duration-200
                            ${buttons[4].exists 
                                ? 'bg-sky-700 text-white hover:bg-sky-600' 
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        disabled={!buttons[4].exists || isLoading}
                    >
                        <span className="mr-2">{buttons[4].icon}</span>
                        {buttons[4].name}
                    </button>
                </div>
                <div className="flex justify-center">
                    {showStimulationMenu ? (
                        <div className="flex gap-4 w-3/4">
                            <button
                                onClick={() => handleButtonClick(buttons[3], 'Functional Mapping')}
                                className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-colors duration-200 ${
                                    patient.stimulation_types.mapping 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                disabled={!patient.stimulation_types.mapping}
                            >
                                <span className="mr-2">⚡</span>
                                Functional Mapping
                            </button>
                            <button
                                onClick={() => handleButtonClick(buttons[3], 'Seizure Recreation')}
                                className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-colors duration-200 ${
                                    patient.stimulation_types.recreation 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                disabled={!patient.stimulation_types.recreation}
                            >
                                <span className="mr-2">⚡</span>
                                Seizure Recreation
                            </button>
                            <button
                                onClick={() => handleButtonClick(buttons[3], 'CCEPs')}
                                className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-colors duration-200 ${
                                    patient.stimulation_types.ccep 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                disabled={!patient.stimulation_types.ccep}
                            >
                                <span className="mr-2">⚡</span>
                                CCEPs
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowStimulationMenu(!showStimulationMenu)}
                            className={`w-1/2 py-4 px-6 rounded-lg text-lg font-semibold transition-colors duration-200
                                ${buttons[3].exists 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                            disabled={!buttons[3].exists || isLoading}
                        >
                            <span className="mr-2">{buttons[3].icon}</span>
                            {buttons[3].name}
                        </button>
                    )}
                </div>
                {isLoading && (
                    <div className="mt-4 text-center text-gray-600">
                        Loading files...
                    </div>
                )}
            </div>

            <Legend isOpen={showLegend} onClose={() => setShowLegend(false)} />
        </div>
    );
};

const RecentFiles = ({ onOpenFile, className }) => {
    const [recentPatients, setRecentPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showLegend, setShowLegend] = useState(false);
    const [showStimulationMenu, setShowStimulationMenu] = useState(null);
    const { showError } = useError();
    const { showWarning } = useWarning();
    
    // Get addTab from HomePage context
    const addTab = window.addTab;
    
    useEffect(() => {
        const fetchRecentPatients = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setRecentPatients([]);
                    return;
                }

                const response = await fetch(`${backendURL}/api/patients/recent`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch recent patients');
                }

                const data = await response.json();
                setRecentPatients(data.patients.slice(0, 7));
            } catch (error) {
                if (error.name === "NetworkError" || error.message.toString().includes("NetworkError")) {
                    showWarning("No internet connection. Failed to load recent patients");
                } else {
                    console.error('Error fetching recent patients:', error);
                    showError('Failed to load recent patients');
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchRecentPatients();
    }, [showError]);
    
    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
    };
    
    return (
        <div className={`justify-center ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold
                               md:text-2xl
                               lg:text-3xl
                               xl:text-4xl">
                    Recent Patients
                </h3>
                <button 
                    onClick={() => setShowLegend(true)}
                    className="text-gray-500 text-base
                               transition-colors duration-200 cursor-pointer hover:text-gray-700
                               lg:text-lg
                               xl:text-xl"
                    title="Show Legend"
                >
                    ?
                </button>
            </div>
            <div className="bg-gray-200 rounded-xl p-2 mt-2">
                {isLoading ? (
                    <div className="text-gray-600">Loading...</div>
                ) : recentPatients.length > 0 ? (
                    <div>
                        {recentPatients.map((patient) => (
                            <div 
                                id={`patient-${patient.patient_id}`}
                                key={patient.patient_id} 
                                className="hover:bg-sky-50 hover:text-sky-600 rounded cursor-pointer py-1 pr-1 transition-colors duration-150 flex justify-between items-center"
                                onClick={() => handlePatientClick(patient)}
                            >
                                <div className="text-xs truncate max-w-30 patient-id px-1
                                                md:max-w-42
                                                lg:max-w-50 lg:text-sm lg:px-2
                                                xl:max-w-64">
                                    {formatPatientDisplay(patient)}
                                </div>
                                <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                    {patient.has_localization && (
                                        <span className="mr-2 cursor-help" title="Anatomy File">📍</span>
                                    )}
                                    {patient.has_designation && (
                                        <span className="mr-2 cursor-help" title="Epilepsy File">📝</span>
                                    )}
                                    {patient.has_resection && (
                                        <span className="mr-2 cursor-help" title="Neurosurgery File">🔪</span>
                                    )}
                                    {(patient.stimulation_types.mapping || patient.stimulation_types.recreation || patient.stimulation_types.ccep) && (
                                        <span className="mr-2 cursor-help" title="Stimulation File">⚡</span>
                                    )}
                                    {patient.has_test_selection && (
                                        <span className="cursor-help" title="Neuropsychology File">🧪</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-600">No patients available</div>
                )}
            </div>

            {selectedPatient && (
                <PatientDetails
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                    openSavedFile={onOpenFile}
                />
            )}

            <Legend isOpen={showLegend} onClose={() => setShowLegend(false)} />
        </div>
    );
};

const Logo = () => {
    return (
        <div className="flex flex-col items-center m-5 mt-20 lg:mb-10">
            <h1 className="text-3xl font-bold
                           lg:text-5xl
                           xl:text-8xl">
                Wirecracker
            </h1>
        </div>
    );
};

export const GoogleSignInButton = () => {
    const handleGoogleSignIn = () => {
        window.location.href = `${backendURL}/auth/google`;
    };

    return (
        <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
            <FcGoogle className="h-5 w-5 mr-2" />
            Sign in with Google
        </button>
    );
};

const SignInButtons = () => {
    return (
        <div>
            <div className="flex justify-center m-5
                            md:m-6
                            lg:m-8
                            xl:m-10">
                <Link to="/signup">
                    <button
                        className="border-solid border border-sky-700 bg-sky-700 text-white font-semibold rounded-xl w-24 py-1 mr-2 text-xs transition-colors duration-200 cursor-pointer hover:bg-sky-100 hover:text-sky-700
                                   md:w-28 md:mr-3 md:text-sm
                                   lg:w-32 lg:py-2 lg:mr-4 lg:text-md
                                   xl:w-40 xl:py-3 xl:mr-5 xl:text-xl"
                    >
                        Sign Up
                    </button>
                </Link>
                <Link to="/login">
                    <button
                        className="border-solid border border-sky-700 bg-sky-700 text-white font-semibold rounded-xl w-24 py-1 text-xs transition-colors duration-200 cursor-pointer hover:bg-sky-100 hover:text-sky-700
                                   md:w-28 md:text-sm
                                   lg:w-32 lg:py-2 lg:text-md
                                   xl:w-40 xl:py-3 xl:text-xl"
                    >
                        Log In
                    </button>
                </Link>
            </div>
        </div>
    );
};

const NewSharedFile = ({ openSavedFile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [sharedPatients, setSharedPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showLegend, setShowLegend] = useState(false);
    const { showError } = useError();
    const { showWarning } = useWarning();

    useEffect(() => {
        const fetchSharedPatients = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setSharedPatients([]);
                    return;
                }

                const response = await fetch(`${backendURL}/api/shared-files`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch shared files');
                }

                const data = await response.json();
                setSharedPatients(data.patients || []);
            } catch (error) {
                if (error.name === "NetworkError" || error.message.toString().includes("NetworkError")) {
                    showWarning("No internet connection. Failed to load shared files");
                } else {
                    console.error('Error fetching shared patients:', error);
                    showError('Failed to load shared files');
                }
                setSharedPatients([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchSharedPatients();
        window.addEventListener('refreshSharedFiles', fetchSharedPatients);
        return () => window.removeEventListener('refreshSharedFiles', fetchSharedPatients);
    }, [showError]);

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
    };
    
    return (
        <div
            className="text-violet-800 text-base font-semibold flex gap-x-2 cursor-pointer
                       md:text-lg
                       lg:text-xl
                       xl:text-2xl"
            onClick={() => setIsOpen(!isOpen)}
        >
            {isOpen ? (
                <>
                    <div className="before:content-['▾']"></div>
                    <div className="mb-2 lg:mb-4 xl:mb-5 whitespace-nowrap">
                        <div className="flex items-center justify-between">
                            <div>New Shared File</div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowLegend(true); }}
                                className="text-gray-500 text-base
                                           transition-colors duration-200 cursor-pointer hover:text-gray-700
                                           lg:text-lg
                                           xl:text-xl"
                                title="Show Legend"
                            >
                                ?
                            </button>
                        </div>
                        {loading ? <div className="text-xs text-gray-500">Loading...</div> : (
                            <div className="bg-gray-200 rounded-xl p-2 mt-2">
                                {sharedPatients.length === 0 ? (
                                    <div className="text-gray-500">No new shared files</div>
                                ) : (
                                    sharedPatients.map(patient => (
                                        <div
                                            key={patient.patient_id}
                                            className="hover:bg-sky-50 hover:text-sky-600 rounded cursor-pointer py-1 pr-1 transition-colors duration-150 flex justify-between items-center"
                                            onClick={(e) => { e.stopPropagation(); handlePatientClick(patient); }}
                                        >
                                            <div className="text-xs truncate max-w-30 patient-id px-1
                                                            md:max-w-42
                                                            lg:max-w-50 lg:text-sm lg:px-2
                                                            xl:max-w-64">
                                                {formatPatientDisplay(patient)}
                                            </div>
                                            <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                                {patient.has_localization && (
                                                    <span className="mr-2 cursor-help" title="Anatomy File">📍</span>
                                                )}
                                                {patient.has_designation && (
                                                    <span className="mr-2 cursor-help" title="Epilepsy File">📝</span>
                                                )}
                                                {patient.has_resection && (
                                                    <span className="mr-2 cursor-help" title="Neurosurgery File">🔪</span>
                                                )}
                                                {(patient.stimulation_types.mapping || patient.stimulation_types.recreation || patient.stimulation_types.ccep) && (
                                                    <span className="mr-2 cursor-help" title="Stimulation File">⚡</span>
                                                )}
                                                {patient.has_test_selection && (
                                                    <span className="cursor-help" title="Neuropsychology File">🧪</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    {selectedPatient && (
                        <PatientDetails
                            patient={selectedPatient}
                            onClose={() => setSelectedPatient(null)}
                            openSavedFile={openSavedFile}
                        />
                    )}
                    <Legend isOpen={showLegend} onClose={() => setShowLegend(false)} />
                </>
            ) : (
                <>
                    <div className="before:content-['▸']"></div>
                    <div>New Shared File</div>
                </>
            )}
        </div>
    );
};

const Approved = () => {
    const [isApprovedOpen, setIsApprovedOpen] = useState(false);

    return (
        <div
            className="text-green-800 text-base font-semibold flex gap-x-2 cursor-pointer
                       md:text-lg
                       lg:text-xl
                       xl:text-2xl"
            onClick={() => setIsApprovedOpen(!isApprovedOpen)}
        >
            {isApprovedOpen ? (
                <>
                    <div className="before:content-['▾']"></div>
                    <div className="mb-2 lg:mb-4 xl:mb-5 whitespace-nowrap">
                        <div>Approved</div>
                    </div>
                </>
            ) : (
                <>
                    <div className="before:content-['▸']"></div>
                    <div>Approved</div>
                </>
            )}
        </div>
    );
};

const App = () => {
    return (
        <ErrorProvider>
        <WarningProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />
{/*                    <Route path="/localization" element={<Localization />} />
                    <Route path="/stimulation" element={<PlanTypePage />} />
                    <Route path="/stimulation/contacts" element={<ContactSelection />} />
                    <Route path="/stimulation/functional-tests" element={<FunctionalTestSelection />*/}
                    <Route path="/debug" element={<Debug />} />
                    <Route path="/database/:table" element={<DatabaseTable />} />
                    <Route path="/auth-success" element={<GoogleAuthSuccess />} />
                    <Route path="/usage-docs/:path" element={<UserDocumentation/>} />
                </Routes>
            </Router>
        </WarningProvider>
        </ErrorProvider>
    );
};

export default App;
