OpenProject::Application.routes.draw do
  scope 'projects/:project_id/capacity_management', as: 'capacity_management' do
    get '/',      to: 'capacity_management/dashboard#index',            as: 'dashboard'
    get '/data',  to: 'capacity_management/dashboard#data',             as: 'data'
    post '/save_capacity',      to: 'capacity_management/dashboard#save_capacity',      as: 'save_capacity'
    post '/save_retrospective', to: 'capacity_management/dashboard#save_retrospective', as: 'save_retrospective'
  end
end
