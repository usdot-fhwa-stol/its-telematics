package com.telematic.telematic_rsu_management_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;

public interface TRUConfigStatusRepository extends JpaRepository<TRUConfigStatus, Long> {
	@Query("select t from TRUConfigStatus t where t.unitConfig.unitId = :unitId")
	TRUConfigStatus findByUnitId(@Param("unitId") String unitId);
}
