/*
 * Copyright (C) 2025 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.telematic.telematic_rsu_management_service.repository.mysql;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;

public interface TRUConfigStatusRepository extends JpaRepository<TRUConfigStatus, Long> {
	@Query("select t from TRUConfigStatus t where t.unitConfig.unitId = :unitId")
	TRUConfigStatus findByUnitId(@Param("unitId") String unitId);

	@EntityGraph(attributePaths = {
			"unitConfig",
			"pluginConfigStatus",
			"rsuConfigs",
			"rsuConfigs.rsu"
	})
	@Query("select t from TRUConfigStatus t")
	List<TRUConfigStatus> findAllWithAssociations();

	@EntityGraph(attributePaths = {
			"unitConfig",
			"pluginConfigStatus",
			"rsuConfigs",
			"rsuConfigs.rsu"
	})
	@Query("select t from TRUConfigStatus t where t.unitConfig.unitId = :unitId")
	TRUConfigStatus findByUnitIdWithAssociations(@Param("unitId") String unitId);

	boolean existsByRsuConfigs_Rsu_Ip(String ip);
}
