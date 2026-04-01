import React from 'react';

export default function ArticlesView() {
  // Expanded list with mock statistics data for the dashboard
  const ViewsBarList = [
    {
      id: 'views_container',
      title: 'Total Views',
      value: '45,231',
      change: '+12.5%',
      trend: 'up', // 'up' or 'down' can dictate the color of the change metric
    },
    {
      id: 'read_time',
      title: 'Avg. Read Time',
      value: '3m 42s',
      change: '+5.2%',
      trend: 'up',
    },
    {
      id: 'most_popular',
      title: 'Active Readers',
      value: '1,204',
      change: '-1.4%',
      trend: 'down',
    }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your articles today.</p>
      </div>

      {/* Responsive Grid Layout: 1 column on mobile, 3 columns on medium screens and up */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {
          ViewsBarList.map((bar) => {
            return (
              <div 
                key={bar.id} 
                className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col"
              >
                {/* Statistic Title */}
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {bar.title}
                </h3>
                
                {/* Statistic Value & Trend */}
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {bar.value}
                  </span>
                  
                  <span 
                    className={`text-sm font-semibold ${
                      bar.trend === 'up' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {bar.change}
                  </span>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  );
}