import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { CreateOrganizationInput, Organization } from "../types/organization";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const ACTIVE_ORGANIZATION_KEY = "oberyn.activeOrganizationId";
let organizationsCache: Organization[] | null = null;
let organizationsRequest: Promise<Organization[]> | null = null;

export function useOrganizations() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORGANIZATION_KEY));
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken() {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }

  function setActiveOrganizationId(organizationId: string | null) {
    setActiveOrganizationIdState(organizationId);
    if (organizationId) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
    else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }

  async function fetchOrganizations() {
    if (organizationsCache) return organizationsCache;
    if (organizationsRequest) return organizationsRequest;

    organizationsRequest = (async () => {
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<Organization[]>>("/organizations", token);
      organizationsCache = response.data;
      organizationsRequest = null;
      return response.data;
    })().catch((requestError) => {
      organizationsRequest = null;
      throw requestError;
    });

    return organizationsRequest;
  }

  async function loadOrganizations({ force = false } = {}) {
    if (!isLoaded) return;
    if (organizationsCache && !force) {
      setOrganizations(organizationsCache);
      const storedId = localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
      const nextActive = organizationsCache.find((organization) => organization.id === storedId)?.id ?? organizationsCache[0]?.id ?? null;
      setActiveOrganizationId(nextActive);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (force) organizationsCache = null;
      const organizationsData = await fetchOrganizations();
      setOrganizations(organizationsData);

      const storedId = localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
      const nextActive = organizationsData.find((organization) => organization.id === storedId)?.id ?? organizationsData[0]?.id ?? null;
      setActiveOrganizationId(nextActive);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las organizaciones.");
      setOrganizations([]);
      setActiveOrganizationId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [isLoaded, isSignedIn]);

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [organizations, activeOrganizationId],
  );

  async function createOrganization(input: CreateOrganizationInput) {
    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<Organization>>("/organizations", input, token);
    organizationsCache = [response.data, ...(organizationsCache ?? organizations).filter((organization) => organization.id !== response.data.id)];
    setOrganizations(organizationsCache);
    setActiveOrganizationId(response.data.id);
    return response.data;
  }

  return {
    organizations,
    activeOrganization,
    activeOrganizationId,
    isLoading,
    error,
    reloadOrganizations: () => loadOrganizations({ force: true }),
    createOrganization,
    setActiveOrganizationId,
  };
}
