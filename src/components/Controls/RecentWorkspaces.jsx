// Create a new file: src/components/Controls/RecentWorkspaces.jsx
import React from 'react';
import { RefreshCw, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../supabase';

const RecentWorkspaces = ({ workspaces, onLoadWorkspace, onRefresh, showAll }) => {
  const [deletingId, setDeletingId] = React.useState(null);

  const handleDelete = async (e, workspaceId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workspace? This will not delete the individual charts.')) {
      return;
    }

    setDeletingId(workspaceId);
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;
      
      // Refresh the list after deletion
      onRefresh();
    } catch (err) {
      console.error('Error deleting workspace:', err);
      alert(`Failed to delete workspace: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="recent-workspaces-container">
      {workspaces.length === 0 ? (
        <div className="no-workspaces">
          <p>No saved workspaces found. Create and save a workspace to see it here.</p>
        </div>
      ) : (
        <div className="workspaces-grid">
          {workspaces.map(workspace => (
            <div 
              key={workspace.id} 
              className="workspace-card" 
              onClick={() => onLoadWorkspace(workspace)}
            >
              <div className="workspace-card-header">
                <h3>{workspace.title}</h3>
                <span className="workspace-date">
                  {new Date(workspace.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="workspace-card-content">
                <FileText size={24} />
                <div className="workspace-stats">
                  <span>{workspace.chart_ids.length} charts</span>
                  <p>{workspace.description || 'No description'}</p>
                </div>
              </div>
              
              <div className="workspace-card-footer">
                <button 
                  className="delete-button" 
                  onClick={(e) => handleDelete(e, workspace.id)}
                  disabled={deletingId === workspace.id}
                >
                  {deletingId === workspace.id ? 
                    <RefreshCw size={16} className="spinner" /> : 
                    <Trash2 size={16} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentWorkspaces;
