/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Warehouse
} from 'lucide-react';
import { InventoryItem, StockStatus } from '../types';

interface LiveInventoryTableProps {
  items: InventoryItem[];
  onManualAdjust: (sku: string, deltaQuantity: number, reservedDelta: number, reason: string, warehouseId: string) => Promise<void>;
  onRefresh: () => void;
  onSelectForSupportQuery: (sku: string) => void;
}

export const LiveInventoryTable: React.FC<LiveInventoryTableProps> = ({
  items,
  onManualAdjust,
  onRefresh,
  onSelectForSupportQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustReserved, setAdjustReserved] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Manual warehouse receipt adjustment');
  const [adjustWarehouse, setAdjustWarehouse] = useState<string>('WH-CENTRAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            In Stock
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </span>
        );
      case 'RESERVED_ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            Reserved Only
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Out of Stock
          </span>
        );
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;
    setIsSubmitting(true);
    try {
      await onManualAdjust(
        adjustModalItem.sku,
        Number(adjustDelta),
        Number(adjustReserved),
        adjustReason,
        adjustWarehouse
      );
      setAdjustModalItem(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-rose-600" />
              Real-Time Stock Inventory (Live Sync Engine)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live synchronized state updated instantly via HMAC-verified Webhook Push events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU (e.g. NSTR-PHN-01) or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock (At Threshold)</option>
              <option value="RESERVED_ONLY">Reserved Only</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Available</th>
                <th className="py-3 px-4 text-right">Physical Total</th>
                <th className="py-3 px-4 text-right">Reserved</th>
                <th className="py-3 px-4">Warehouse Locations</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No matching inventory records found for criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const timeAgo = Math.max(1, Math.round((Date.now() - item.lastSyncTimestamp) / 1000));

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        {/* Product / SKU */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              {item.sku}
                            </span>
                            <span className="text-[11px] text-slate-400">{item.category}</span>
                            <span className="text-[11px] font-medium text-slate-600">${item.price.toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>

                        {/* Available Quantity */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`text-sm font-bold ${
                              item.availableQuantity > 0 ? 'text-slate-900' : 'text-rose-600'
                            }`}
                          >
                            {item.availableQuantity}
                          </span>
                          <div className="text-[10px] text-slate-400">Safety: {item.safetyThreshold}</div>
                        </td>

                        {/* Physical Total */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {item.totalQuantity}
                        </td>

                        {/* Reserved */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-medium ${item.totalReserved > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {item.totalReserved}
                          </span>
                        </td>

                        {/* Warehouse Locations */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.locations.map((loc) => (
                              <span
                                key={loc.warehouseId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
                                title={`${loc.warehouseName} (Aisle: ${loc.aisle}) - Qty: ${loc.quantity}, Avail: ${loc.available}`}
                              >
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {loc.warehouseId.replace('WH-', '')}: <strong>{loc.available}</strong>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Last Sync */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.round(timeAgo / 60)}m ago`}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            v{item.version} • {item.syncSource}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectForSupportQuery(item.sku)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                              title="Open in Customer Support Stock Checker"
                            >
                              Support Check
                            </button>
                            <button
                              onClick={() => setAdjustModalItem(item)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
                              title="Manual stock adjust / restock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                              title="View warehouse breakdown & history"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Warehouse Breakdown & Change History Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Warehouse Details */}
                              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                                <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                                  <Warehouse className="w-3.5 h-3.5 text-rose-600" />
                                  Physical Warehouse Breakdown for {item.sku}
                                </h4>
                                <div className="space-y-2">
                                  {item.locations.map((loc) => (
                                    <div
                                      key={loc.warehouseId}
                                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-800">{loc.warehouseName}</div>
                                        <div className="text-[10px] text-slate-500">
                                          Region: {loc.region} • Aisle/Bin: {loc.aisle}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-emerald-700">
                                          {loc.available} <span className="text-[10px] font-normal text-slate-500">avail</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          (Total: {loc.quantity}, Res: {loc.reserved})
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Live Change Audit History */}
                              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                                <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                                  <History className="w-3.5 h-3.5 text-slate-600" />
                                  Recent Sync Audit Trail
                                </h4>
                                {item.changeHistory && item.changeHistory.length > 0 ? (
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {item.changeHistory.map((hist, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start justify-between text-[11px] p-1.5 rounded bg-slate-50 border border-slate-100"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {hist.delta >= 0 ? (
                                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          ) : (
                                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                          )}
                                          <div>
                                            <span className="font-medium text-slate-700">{hist.reason}</span>
                                            <div className="text-[10px] text-slate-400">
                                              {new Date(hist.timestamp).toLocaleTimeString()} • {hist.source}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="font-mono font-bold text-right shrink-0">
                                          <span className={hist.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                            {hist.delta > 0 ? `+${hist.delta}` : hist.delta}
                                          </span>
                                          <div className="text-[9px] text-slate-400">
                                            {hist.previousQuantity} → {hist.newQuantity}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    No changes recorded yet in current session.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjust Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adjust Stock for {adjustModalItem.sku}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{adjustModalItem.title}</p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Facility
                </label>
                <select
                  value={adjustWarehouse}
                  onChange={(e) => setAdjustWarehouse(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                >
                  <option value="WH-CENTRAL">Central Logistics Hub (Chicago)</option>
                  <option value="WH-WEST">Pacific Depot (Seattle)</option>
                  <option value="WH-EAST">Atlantic Gateway (Newark)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delta Quantity (+ / -)
                  </label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 font-mono"
                    placeholder="e.g. 10 or -5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reserved Delta
                  </label>
                  <input
                    type="number"
                    value={adjustReserved}
                    onChange={(e) => setAdjustReserved(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 font-mono"
                    placeholder="e.g. 2 or 0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  placeholder="e.g. Dock delivery check"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Applying...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
