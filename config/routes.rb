OpenProject::Application.routes.draw do
  scope 'projects/:project_id/capacity_management', as: 'capacity_management' do
    get '/', to: 'capacity_management/dashboard#index', as: 'dashboard'
    get '/data', to: 'capacity_management/dashboard#data', as: 'data'
    post '/update_capacity', to: 'capacity_management/dashboard#update_capacity', as: 'update_capacity'
  end
end
